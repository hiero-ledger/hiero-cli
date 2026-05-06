import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenTransferFtOutput } from './output';
import type {
  TokenTransferFtBuildTransactionResult,
  TokenTransferFtExecuteTransactionResult,
  TokenTransferFtNormalizedParams,
  TokenTransferFtSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { FtTransferEntry } from '@/core/services/transfer';
import { isRawUnits } from '@/core/utils/amount-helpers';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenTransferFtInputSchema } from './input';

export const TOKEN_TRANSFER_FT_COMMAND_NAME = 'token_transfer-ft';

export class TokenTransferFtCommand extends BaseTransactionCommand<
  TokenTransferFtNormalizedParams,
  TokenTransferFtBuildTransactionResult,
  TokenTransferFtSignTransactionResult,
  TokenTransferFtExecuteTransactionResult
> {
  constructor() {
    super(TOKEN_TRANSFER_FT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TokenTransferFtNormalizedParams> {
    const { api, logger } = args;

    const tokenState = new ZustandTokenStateHelper(api.state, logger);

    const validArgs = TokenTransferFtInputSchema.parse(args.args);

    const tokenIdOrAlias = validArgs.token;
    const from = validArgs.from;
    const to = validArgs.to;
    const keyManagerArg = validArgs.keyManager;

    const keyManager =
      keyManagerArg || api.config.getOption<KeyManager>('default_key_manager');

    const network = api.network.getCurrentNetwork();

    const resolvedToken = resolveTokenParameter(tokenIdOrAlias, api, network);

    if (!resolvedToken) {
      throw new NotFoundError(`Token not found: ${tokenIdOrAlias}`, {
        context: { tokenIdOrAlias },
      });
    }

    const tokenId = resolvedToken.tokenId;

    const userAmountInput = validArgs.amount;

    let tokenDecimals = 0;
    if (!isRawUnits(userAmountInput)) {
      const tokenInfoStorage = tokenState.getToken(tokenId);

      if (tokenInfoStorage) {
        tokenDecimals = tokenInfoStorage.decimals;
      } else {
        const tokenInfoMirror = await api.mirror.getTokenInfo(tokenId);
        tokenDecimals = parseInt(tokenInfoMirror.decimals) || 0;
      }
    }

    const rawAmount = processTokenBalanceInput(userAmountInput, tokenDecimals);

    const resolvedFromAccount = await api.keyResolver.resolveAccountCredentials(
      from,
      keyManager,
      true,
      ['token:account'],
    );

    const { accountId: fromAccountId, keyRefId: signerKeyRefId } =
      resolvedFromAccount;

    logger.info(`🔑 Using from account: ${fromAccountId}`);
    logger.info(`🔑 Will sign with from account key`);

    const resolvedToAccount = resolveDestinationAccountParameter(
      to,
      api,
      network,
    );

    if (!resolvedToAccount) {
      throw new NotFoundError(`Destination account not found: ${to}`, {
        context: { to },
      });
    }

    const toAccountId = resolvedToAccount.accountId;

    logger.info(
      `Transferring ${rawAmount.toString()} tokens of ${tokenId} from ${fromAccountId} to ${toAccountId}`,
    );

    return {
      network,
      tokenId,
      fromAccountId,
      toAccountId,
      rawAmount,
      signerKeyRefId,
      keyRefIds: [signerKeyRefId],
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenTransferFtNormalizedParams,
  ): Promise<TokenTransferFtBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building transfer transaction body');
    const transaction = api.transfer.buildTransferTransaction([
      new FtTransferEntry(
        normalisedParams.fromAccountId,
        normalisedParams.toAccountId,
        normalisedParams.tokenId,
        normalisedParams.rawAmount,
      ),
    ]);
    return {
      transaction,
    };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenTransferFtNormalizedParams,
    buildTransactionResult: TokenTransferFtBuildTransactionResult,
  ): Promise<TokenTransferFtSignTransactionResult> {
    const { api, logger } = args;
    const signerKeyRefId = normalisedParams.signerKeyRefId;
    logger.debug(`Using key ${signerKeyRefId} for signing transaction`);
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [signerKeyRefId],
    );
    return {
      signedTransaction: transaction,
    };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TokenTransferFtNormalizedParams,
    _buildTransactionResult: TokenTransferFtBuildTransactionResult,
    signTransactionResult: TokenTransferFtSignTransactionResult,
  ): Promise<TokenTransferFtExecuteTransactionResult> {
    const { api } = args;
    const signedTransaction = signTransactionResult.signedTransaction;
    const result = await api.txExecute.execute(signedTransaction);

    if (!result.success) {
      throw new TransactionError(
        `Fungible token transfer failed (tokenId: ${normalisedParams.tokenId}, from: ${normalisedParams.fromAccountId}, to: ${normalisedParams.toAccountId}, txId: ${result.transactionId})`,
        false,
      );
    }

    return {
      transactionResult: result,
    };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: TokenTransferFtNormalizedParams,
    _buildTransactionResult: TokenTransferFtBuildTransactionResult,
    _signTransactionResult: TokenTransferFtSignTransactionResult,
    executeTransactionResult: TokenTransferFtExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: TokenTransferFtOutput = {
      transactionId: executeTransactionResult.transactionResult.transactionId,
      tokenId: normalisedParams.tokenId,
      from: normalisedParams.fromAccountId,
      to: normalisedParams.toAccountId,
      amount: normalisedParams.rawAmount,
      network: normalisedParams.network,
    };
    return { result: outputData };
  }
}

export async function tokenTransferFt(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenTransferFtCommand().execute(args);
}
