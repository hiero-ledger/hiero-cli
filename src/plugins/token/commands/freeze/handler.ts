import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenFreezeOutput } from './output';
import type {
  FreezeBuildTransactionResult,
  FreezeExecuteTransactionResult,
  FreezeNormalizedParams,
  FreezeSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { isNoFreezeKeyError } from '@/plugins/token/utils/transaction-error-receipt-status';

import { TokenFreezeInputSchema } from './input';

export const TOKEN_FREEZE_COMMAND_NAME = 'token_freeze';

export class TokenFreezeCommand extends BaseTransactionCommand<
  FreezeNormalizedParams,
  FreezeBuildTransactionResult,
  FreezeSignTransactionResult,
  FreezeExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_FREEZE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<FreezeNormalizedParams> {
    const { api, logger } = args;

    const validArgs = TokenFreezeInputSchema.parse(args.args);

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);
    if (!resolvedToken) {
      throw new NotFoundError('Token not found', {
        context: { token: validArgs.token },
      });
    }
    const tokenId = resolvedToken.tokenId;

    const tokenInfo = await api.mirror.getTokenInfo(tokenId);

    const { accountId } = await api.identityResolution.resolveAccount({
      accountReference: validArgs.account.value,
      type: validArgs.account.type,
      network,
    });

    logger.info(
      `Freezing account ${accountId} for token ${tokenId} on ${network}`,
    );

    const { keyRefIds } =
      await api.keyResolver.resolveSigningKeyRefIdsFromMirrorRoleKey({
        mirrorRoleKey: tokenInfo.freeze_key,
        explicitCredentials: validArgs.freezeKey,
        keyManager,
        resolveSigningKeyLabels: ['token:freeze'],
        emptyMirrorRoleKeyMessage: 'Token has no freeze key',
        insufficientKmsMatchesMessage:
          'Not enough freeze key(s) found in key manager for this token. Provide --freeze-key.',
        validationErrorOptions: { context: { tokenId } },
      });

    return {
      network,
      tokenId,
      accountId,
      keyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: FreezeNormalizedParams,
  ): Promise<FreezeBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building token freeze transaction');
    const transaction = api.token.createFreezeTransaction({
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.accountId,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: FreezeNormalizedParams,
    buildTransactionResult: FreezeBuildTransactionResult,
  ): Promise<FreezeSignTransactionResult> {
    const { api, logger } = args;
    logger.debug(
      `Using ${normalisedParams.keyRefIds.length} key(s) for signing transaction`,
    );
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.keyRefIds,
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: FreezeNormalizedParams,
    _buildTransactionResult: FreezeBuildTransactionResult,
    signTransactionResult: FreezeSignTransactionResult,
  ): Promise<FreezeExecuteTransactionResult> {
    const { api } = args;
    try {
      const result = await api.txExecute.execute(
        signTransactionResult.signedTransaction,
      );

      if (!result.success) {
        throw new TransactionError(
          `Token freeze failed (tokenId: ${normalisedParams.tokenId}, txId: ${result.transactionId})`,
          false,
        );
      }

      return { transactionResult: result };
    } catch (error) {
      if (isNoFreezeKeyError(error)) {
        throw new ValidationError('Token has no freeze key', {
          context: { tokenId: normalisedParams.tokenId },
        });
      }
      throw error;
    }
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: FreezeNormalizedParams,
    _buildTransactionResult: FreezeBuildTransactionResult,
    _signTransactionResult: FreezeSignTransactionResult,
    executeTransactionResult: FreezeExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenFreezeOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.accountId,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenFreeze(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenFreezeCommand().execute(args);
}
