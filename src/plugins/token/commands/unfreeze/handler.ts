import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenUnfreezeInput } from './input';
import type { TokenUnfreezeOutput } from './output';
import type {
  UnfreezeBuildTransactionResult,
  UnfreezeExecuteTransactionResult,
  UnfreezeNormalizedParams,
  UnfreezeSignTransactionResult,
} from './types';

import { ReceiptStatusError, Status as HederaStatus } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';

import { TokenUnfreezeInputSchema } from './input';

export const TOKEN_UNFREEZE_COMMAND_NAME = 'token_unfreeze';

function isNoFreezeKeyError(error: unknown): boolean {
  if (!(error instanceof TransactionError)) {
    return false;
  }

  const cause = error.cause;
  return (
    cause instanceof ReceiptStatusError &&
    cause.status === HederaStatus.TokenHasNoFreezeKey
  );
}

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

    if (!tokenInfo.freeze_key) {
      throw new ValidationError('Token has no freeze key', {
        context: { tokenId },
      });
    }

    const { accountId } = await api.identityResolution.resolveAccount({
      accountReference: validArgs.account.value,
      type: validArgs.account.type,
      network,
    });

    logger.info(
      `Unfreezing account ${accountId} for token ${tokenId} on ${network}`,
    );

    const freezeKeyResolved = await this.resolveFreezeKey(
      api.keyResolver,
      validArgs,
      keyManager,
      tokenInfo.freeze_key.key,
      tokenId,
    );

    logger.debug(`Using freeze key: ${freezeKeyResolved.keyRefId}`);

    return {
      network,
      tokenId,
      accountId,
      freezeKeyResolved,
      keyRefIds: [freezeKeyResolved.keyRefId],
    };
  }

  private async resolveFreezeKey(
    keyResolver: KeyResolverService,
    validArgs: TokenUnfreezeInput,
    keyManager: KeyManager,
    tokenFreezePublicKey: string,
    tokenId: string,
  ): Promise<ResolvedPublicKey> {
    const freezeKeyResolved = await keyResolver.resolveSigningKey(
      validArgs.freezeKey,
      keyManager,
      false,
      ['token:unfreeze'],
    );

    if (tokenFreezePublicKey !== freezeKeyResolved.publicKey) {
      throw new ValidationError('Freeze key mismatch', {
        context: { tokenId },
      });
    }

    return freezeKeyResolved;
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
    const freezeKeyRefId = normalisedParams.freezeKeyResolved.keyRefId;
    logger.debug(`Using key ${freezeKeyRefId} for signing transaction`);
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [freezeKeyRefId],
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
