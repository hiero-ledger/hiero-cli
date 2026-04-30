import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenUnfreezeOutput } from './output';
import type {
  UnfreezeBuildTransactionResult,
  UnfreezeExecuteTransactionResult,
  UnfreezeNormalizedParams,
  UnfreezeSignTransactionResult,
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

import { TokenUnfreezeInputSchema } from './input';

export const TOKEN_UNFREEZE_COMMAND_NAME = 'token_unfreeze';

export class TokenUnfreezeCommand extends BaseTransactionCommand<
  UnfreezeNormalizedParams,
  UnfreezeBuildTransactionResult,
  UnfreezeSignTransactionResult,
  UnfreezeExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_UNFREEZE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<UnfreezeNormalizedParams> {
    const { api, logger } = args;

    const validArgs = TokenUnfreezeInputSchema.parse(args.args);

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
      `Unfreezing account ${accountId} for token ${tokenId} on ${network}`,
    );

    const { keyRefIds } = await api.keyResolver.resolveSigningKeys({
      mirrorRoleKey: tokenInfo.freeze_key,
      explicitCredentials: validArgs.freezeKey,
      keyManager,
      signingKeyLabels: ['token:freeze'],
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
    normalisedParams: UnfreezeNormalizedParams,
  ): Promise<UnfreezeBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building token unfreeze transaction');
    const transaction = api.token.createUnfreezeTransaction({
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.accountId,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: UnfreezeNormalizedParams,
    buildTransactionResult: UnfreezeBuildTransactionResult,
  ): Promise<UnfreezeSignTransactionResult> {
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
    normalisedParams: UnfreezeNormalizedParams,
    _buildTransactionResult: UnfreezeBuildTransactionResult,
    signTransactionResult: UnfreezeSignTransactionResult,
  ): Promise<UnfreezeExecuteTransactionResult> {
    const { api } = args;
    try {
      const result = await api.txExecute.execute(
        signTransactionResult.signedTransaction,
      );

      if (!result.success) {
        throw new TransactionError(
          `Token unfreeze failed (tokenId: ${normalisedParams.tokenId}, txId: ${result.transactionId})`,
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
    normalisedParams: UnfreezeNormalizedParams,
    _buildTransactionResult: UnfreezeBuildTransactionResult,
    _signTransactionResult: UnfreezeSignTransactionResult,
    executeTransactionResult: UnfreezeExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenUnfreezeOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.accountId,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenUnfreeze(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenUnfreezeCommand().execute(args);
}
