import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenPauseOutput } from './output';
import type {
  PauseBuildTransactionResult,
  PauseExecuteTransactionResult,
  PauseNormalizedParams,
  PauseSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { isNoPauseKeyError } from '@/plugins/token/utils/transaction-error-receipt-status';

import { TokenPauseInputSchema } from './input';

export const TOKEN_PAUSE_COMMAND_NAME = 'token_pause';

export class TokenPauseCommand extends BaseTransactionCommand<
  PauseNormalizedParams,
  PauseBuildTransactionResult,
  PauseSignTransactionResult,
  PauseExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_PAUSE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<PauseNormalizedParams> {
    const { api, logger } = args;

    const validArgs = TokenPauseInputSchema.parse(args.args);

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

    logger.info(`Pausing token ${tokenId} on ${network}`);

    const { keyRefIds } =
      await api.keyResolver.resolveSigningKeyRefIdsFromMirrorRoleKey({
        mirrorRoleKey: tokenInfo.pause_key,
        explicitCredentials: validArgs.pauseKey,
        keyManager,
        resolveSigningKeyLabels: ['token:pause'],
        emptyMirrorRoleKeyMessage: 'Token has no pause key',
        insufficientKmsMatchesMessage:
          'Not enough pause key(s) found in key manager for this token. Provide --pause-key.',
        validationErrorOptions: { context: { tokenId } },
      });

    return {
      network,
      tokenId,
      keyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: PauseNormalizedParams,
  ): Promise<PauseBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building token pause transaction');
    const transaction = api.token.createPauseTransaction({
      tokenId: normalisedParams.tokenId,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: PauseNormalizedParams,
    buildTransactionResult: PauseBuildTransactionResult,
  ): Promise<PauseSignTransactionResult> {
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
    normalisedParams: PauseNormalizedParams,
    _buildTransactionResult: PauseBuildTransactionResult,
    signTransactionResult: PauseSignTransactionResult,
  ): Promise<PauseExecuteTransactionResult> {
    const { api } = args;
    try {
      const result = await api.txExecute.execute(
        signTransactionResult.signedTransaction,
      );

      if (!result.success) {
        throw new TransactionError(
          `Token pause failed (tokenId: ${normalisedParams.tokenId}, txId: ${result.transactionId})`,
          false,
        );
      }

      return { transactionResult: result };
    } catch (error) {
      if (isNoPauseKeyError(error)) {
        throw new ValidationError('Token has no pause key', {
          context: { tokenId: normalisedParams.tokenId },
        });
      }
      throw error;
    }
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: PauseNormalizedParams,
    _buildTransactionResult: PauseBuildTransactionResult,
    _signTransactionResult: PauseSignTransactionResult,
    executeTransactionResult: PauseExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenPauseOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenPause(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenPauseCommand().execute(args);
}
