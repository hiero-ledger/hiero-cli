import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenDissociateOutput } from './output';
import type {
  DissociateBuildTransactionResult,
  DissociateExecuteTransactionResult,
  DissociateNormalizedParams,
  DissociateSignTransactionResult,
} from './types';

import { ValidationError } from '@/core';
import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { resolveTokenParameter } from '@/plugins/token/resolver-helper';

import { TokenDissociateInputSchema } from './input';

export const TOKEN_DISSOCIATE_COMMAND_NAME = 'token_dissociate';

export class TokenDissociateCommand extends BaseTransactionCommand<
  DissociateNormalizedParams,
  DissociateBuildTransactionResult,
  DissociateSignTransactionResult,
  DissociateExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_DISSOCIATE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<DissociateNormalizedParams> {
    const { api, logger } = args;
    const validArgs = TokenDissociateInputSchema.parse(args.args);
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

    if (!isAssociated) {
      throw new ValidationError(
        `Token ${tokenId} is already not associated with account ${account.accountId}`,
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
    return { transactionResult };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: DissociateNormalizedParams,
    _buildTransactionResult: DissociateBuildTransactionResult,
    _signTransactionResult: DissociateSignTransactionResult,
    executeTransactionResult: DissociateExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenDissociateOutput = {
      accountId: normalisedParams.account.accountId,
      tokenId: normalisedParams.tokenId,
      transactionId: executeTransactionResult.transactionResult.transactionId,
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
