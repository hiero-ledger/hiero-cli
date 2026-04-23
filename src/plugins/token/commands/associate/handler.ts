import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenAssociateOutput } from './output';
import type {
  AssociateBuildTransactionResult,
  AssociateExecuteTransactionResult,
  AssociateNormalizedParams,
  AssociateSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';

import { TokenAssociateInputSchema } from './input';

export const TOKEN_ASSOCIATE_COMMAND_NAME = 'token_associate';

export class TokenAssociateCommand extends BaseTransactionCommand<
  AssociateNormalizedParams,
  AssociateBuildTransactionResult,
  AssociateSignTransactionResult,
  AssociateExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_ASSOCIATE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<AssociateNormalizedParams> {
    const { api, logger } = args;
    const validArgs = TokenAssociateInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);
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
      throw new ValidationError(
        `Token ${tokenId} is already associated with account ${account.accountId}`,
      );
    }

    return {
      network,
      tokenId,
      account,
      keyManager,
      keyRefIds: [account.keyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: AssociateNormalizedParams,
  ): Promise<AssociateBuildTransactionResult> {
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
    normalisedParams: AssociateNormalizedParams,
    _buildTransactionResult: AssociateBuildTransactionResult,
    signTransactionResult: AssociateSignTransactionResult,
  ): Promise<AssociateExecuteTransactionResult> {
    const { api } = args;
    const transactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
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
    return { transactionResult };
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: AssociateNormalizedParams,
    _buildTransactionResult: AssociateBuildTransactionResult,
    _signTransactionResult: AssociateSignTransactionResult,
    executeTransactionResult: AssociateExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenAssociateOutput = {
      accountId: normalisedParams.account.accountId,
      tokenId: normalisedParams.tokenId,
      transactionId: executeTransactionResult.transactionResult.transactionId,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export async function tokenAssociate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenAssociateCommand().execute(args);
}
