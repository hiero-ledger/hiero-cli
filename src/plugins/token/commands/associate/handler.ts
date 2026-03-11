import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { AssociateTokenOutput } from './output';
import type {
  AssociateBuildTransactionResult,
  AssociateExecuteTransactionResult,
  AssociateNormalizedParams,
  AssociateSignTransactionResult,
} from './types';

import { ReceiptStatusError, Status as HederaStatus } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { saveAssociationToState } from '@/plugins/token/utils/token-associations';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { AssociateTokenInputSchema } from './input';

function isTokenAlreadyAssociatedError(error: unknown): boolean {
  if (!(error instanceof TransactionError)) {
    return false;
  }

  const cause = error.cause;
  return (
    cause instanceof ReceiptStatusError &&
    cause.status === HederaStatus.TokenAlreadyAssociatedToAccount
  );
}

export class AssociateTokenCommand extends BaseTransactionCommand<
  AssociateNormalizedParams,
  AssociateBuildTransactionResult,
  AssociateSignTransactionResult,
  AssociateExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<AssociateNormalizedParams> {
    const { api, logger } = args;
    const validArgs = AssociateTokenInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManagerName>('default_key_manager');
    const network = api.network.getCurrentNetwork();
    const resolvedToken = resolveTokenParameter(validArgs.token, api, network);

    if (!resolvedToken) {
      throw new NotFoundError('Token not found', {
        context: { token: validArgs.token },
      });
    }

    const tokenId = resolvedToken.tokenId;
    const account = await api.keyResolver.resolveAccountCredentials(
      validArgs.account,
      keyManager,
      ['token:associate'],
    );

    logger.info(`🔑 Using account: ${account.accountId}`);
    logger.info('🔑 Will sign with account key');
    logger.info(
      `Associating token ${tokenId} with account ${account.accountId}`,
    );

    const tokenBalances = await api.mirror.getAccountTokenBalances(
      account.accountId,
      tokenId,
    );
    const alreadyAssociated = tokenBalances.tokens.some(
      (token) => token.token_id === tokenId,
    );

    if (alreadyAssociated) {
      logger.info(
        `Token ${tokenId} is already associated with account ${account.accountId}`,
      );
    }

    return {
      network,
      tokenId,
      account,
      keyManager,
      alreadyAssociated,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: AssociateNormalizedParams,
  ): Promise<AssociateBuildTransactionResult> {
    if (normalisedParams.alreadyAssociated) {
      return {};
    }
    const { api } = args;
    const transaction = api.token.createTokenAssociationTransaction({
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.account.accountId,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: AssociateNormalizedParams,
    buildTransactionResult: AssociateBuildTransactionResult,
  ): Promise<AssociateSignTransactionResult> {
    if (!buildTransactionResult.transaction) {
      return {};
    }
    const { api, logger } = args;
    logger.debug(
      `Using key ${normalisedParams.account.keyRefId} for signing transaction`,
    );
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [normalisedParams.account.keyRefId],
    );
    return { transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: AssociateNormalizedParams,
    _buildTransactionResult: AssociateBuildTransactionResult,
    signTransactionResult: AssociateSignTransactionResult,
  ): Promise<AssociateExecuteTransactionResult> {
    if (
      normalisedParams.alreadyAssociated ||
      !signTransactionResult.transaction
    ) {
      return { alreadyAssociated: true };
    }

    const { api } = args;
    try {
      const transactionResult = await api.txExecute.execute(
        signTransactionResult.transaction,
      );
      if (!transactionResult.success) {
        throw new TransactionError(
          `Token association failed (tokenId: ${normalisedParams.tokenId}, accountId: ${normalisedParams.account.accountId}, txId: ${transactionResult.transactionId})`,
          false,
          {
            context: {
              tokenId: normalisedParams.tokenId,
              accountId: normalisedParams.account.accountId,
            },
          },
        );
      }
      return { transactionResult, alreadyAssociated: false };
    } catch (error) {
      if (isTokenAlreadyAssociatedError(error)) {
        return { alreadyAssociated: true };
      }
      throw error;
    }
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: AssociateNormalizedParams,
    _buildTransactionResult: AssociateBuildTransactionResult,
    _signTransactionResult: AssociateSignTransactionResult,
    executeTransactionResult: AssociateExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    saveAssociationToState(
      tokenState,
      normalisedParams.tokenId,
      normalisedParams.account.accountId,
      normalisedParams.network,
      logger,
    );

    const outputData: AssociateTokenOutput = {
      accountId: normalisedParams.account.accountId,
      tokenId: normalisedParams.tokenId,
      associated: true,
      alreadyAssociated:
        executeTransactionResult.alreadyAssociated || undefined,
      transactionId: executeTransactionResult.transactionResult?.transactionId,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export const associate = (args: CommandHandlerArgs) =>
  new AssociateTokenCommand().execute(args);

export const associateToken = associate;
