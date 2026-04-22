import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenDissociateOutput } from './output';
import type {
  DissociateBuildTransactionResult,
  DissociateExecuteTransactionResult,
  DissociateNormalizedParams,
  DissociateSignTransactionResult,
} from './types';

import { ReceiptStatusError, Status as HederaStatus } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';
import { removeAssociationFromState } from '@/plugins/token/utils/token-associations';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenDissociateInputSchema } from './input';

export const TOKEN_DISSOCIATE_COMMAND_NAME = 'token_dissociate';

function isTokenNotAssociatedError(error: unknown): boolean {
  if (!(error instanceof TransactionError)) {
    return false;
  }

  const cause = error.cause;
  return (
    cause instanceof ReceiptStatusError &&
    cause.status === HederaStatus.TokenNotAssociatedToAccount
  );
}

export class TokenDissociateCommand extends BaseTransactionCommand<
  DissociateNormalizedParams,
  DissociateBuildTransactionResult,
  DissociateSignTransactionResult,
  DissociateExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_DISSOCIATE_COMMAND_NAME);
  }

  override async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const normalisedParams = await this.normalizeParams(args);

    if (normalisedParams.alreadyDissociated) {
      return this.executeAlreadyDissociated(args, normalisedParams);
    }

    return super.execute(args);
  }

  private async executeAlreadyDissociated(
    args: CommandHandlerArgs,
    normalisedParams: DissociateNormalizedParams,
  ): Promise<CommandResult> {
    const { api, logger } = args;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    removeAssociationFromState(
      tokenState,
      normalisedParams.tokenId,
      normalisedParams.account.accountId,
      normalisedParams.network,
      logger,
    );

    const outputData: TokenDissociateOutput = {
      accountId: normalisedParams.account.accountId,
      tokenId: normalisedParams.tokenId,
      dissociated: true,
      alreadyDissociated: true,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<DissociateNormalizedParams> {
    const { api, logger } = args;
    const validArgs = TokenDissociateInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>('default_key_manager');
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
      false,
      ['token:dissociate'],
    );

    logger.info(`🔑 Using account: ${account.accountId}`);
    logger.info('🔑 Will sign with account key');
    logger.info(
      `Dissociating token ${tokenId} from account ${account.accountId}`,
    );

    const tokenBalances = await api.mirror.getAccountTokenBalances(
      account.accountId,
      tokenId,
    );
    const isAssociated = tokenBalances.tokens.some(
      (token) => token.token_id === tokenId,
    );
    const alreadyDissociated = !isAssociated;

    if (alreadyDissociated) {
      logger.info(
        `Token ${tokenId} is not associated with account ${account.accountId} on mirror (already dissociated)`,
      );
    }

    return {
      network,
      tokenId,
      account,
      keyManager,
      alreadyDissociated,
      keyRefIds: [account.keyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: DissociateNormalizedParams,
  ): Promise<DissociateBuildTransactionResult> {
    const { api } = args;
    const transaction = api.token.createTokenDissociationTransaction({
      tokenId: normalisedParams.tokenId,
      accountId: normalisedParams.account.accountId,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: DissociateNormalizedParams,
    buildTransactionResult: DissociateBuildTransactionResult,
  ): Promise<DissociateSignTransactionResult> {
    const { api, logger } = args;
    logger.debug(
      `Using key ${normalisedParams.account.keyRefId} for signing transaction`,
    );
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [normalisedParams.account.keyRefId],
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: DissociateNormalizedParams,
    _buildTransactionResult: DissociateBuildTransactionResult,
    signTransactionResult: DissociateSignTransactionResult,
  ): Promise<DissociateExecuteTransactionResult> {
    const { api } = args;
    try {
      const transactionResult = await api.txExecute.execute(
        signTransactionResult.signedTransaction,
      );
      if (!transactionResult.success) {
        throw new TransactionError(
          `Token dissociation failed (tokenId: ${normalisedParams.tokenId}, accountId: ${normalisedParams.account.accountId}, txId: ${transactionResult.transactionId})`,
          false,
          {
            context: {
              tokenId: normalisedParams.tokenId,
              accountId: normalisedParams.account.accountId,
            },
          },
        );
      }
      return { transactionResult, alreadyDissociated: false };
    } catch (error) {
      if (isTokenNotAssociatedError(error)) {
        return { alreadyDissociated: true };
      }
      throw error;
    }
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: DissociateNormalizedParams,
    _buildTransactionResult: DissociateBuildTransactionResult,
    _signTransactionResult: DissociateSignTransactionResult,
    executeTransactionResult: DissociateExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    removeAssociationFromState(
      tokenState,
      normalisedParams.tokenId,
      normalisedParams.account.accountId,
      normalisedParams.network,
      logger,
    );

    const outputData: TokenDissociateOutput = {
      accountId: normalisedParams.account.accountId,
      tokenId: normalisedParams.tokenId,
      dissociated: true,
      alreadyDissociated:
        executeTransactionResult.alreadyDissociated || undefined,
      transactionId: executeTransactionResult.transactionResult?.transactionId,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export async function tokenDissociate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenDissociateCommand().execute(args);
}
