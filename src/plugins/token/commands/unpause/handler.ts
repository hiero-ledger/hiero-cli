import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenUnpauseOutput } from './output';
import type {
  UnpauseBuildTransactionResult,
  UnpauseExecuteTransactionResult,
  UnpauseNormalizedParams,
  UnpauseSignTransactionResult,
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

import { TokenUnpauseInputSchema } from './input';

export const TOKEN_UNPAUSE_COMMAND_NAME = 'token_unpause';

export class TokenUnpauseCommand extends BaseTransactionCommand<
  UnpauseNormalizedParams,
  UnpauseBuildTransactionResult,
  UnpauseSignTransactionResult,
  UnpauseExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_UNPAUSE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<UnpauseNormalizedParams> {
    const { api, logger } = args;

    const validArgs = TokenUnpauseInputSchema.parse(args.args);

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

    logger.info(`Unpausing token ${tokenId} on ${network}`);

    const { keyRefIds } = await api.keyResolver.resolveSigningKeys({
      mirrorRoleKey: tokenInfo.pause_key,
      explicitCredentials: validArgs.pauseKey,
      keyManager,
      signingKeyLabels: ['token:pause'],
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
    normalisedParams: UnpauseNormalizedParams,
  ): Promise<UnpauseBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building token unpause transaction');
    const transaction = api.token.createUnpauseTransaction({
      tokenId: normalisedParams.tokenId,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: UnpauseNormalizedParams,
    buildTransactionResult: UnpauseBuildTransactionResult,
  ): Promise<UnpauseSignTransactionResult> {
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
    normalisedParams: UnpauseNormalizedParams,
    _buildTransactionResult: UnpauseBuildTransactionResult,
    signTransactionResult: UnpauseSignTransactionResult,
  ): Promise<UnpauseExecuteTransactionResult> {
    const { api } = args;
    try {
      const result = await api.txExecute.execute(
        signTransactionResult.signedTransaction,
      );

      if (!result.success) {
        throw new TransactionError(
          `Token unpause failed (tokenId: ${normalisedParams.tokenId}, txId: ${result.transactionId})`,
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
    normalisedParams: UnpauseNormalizedParams,
    _buildTransactionResult: UnpauseBuildTransactionResult,
    _signTransactionResult: UnpauseSignTransactionResult,
    executeTransactionResult: UnpauseExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenUnpauseOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenUnpause(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenUnpauseCommand().execute(args);
}
