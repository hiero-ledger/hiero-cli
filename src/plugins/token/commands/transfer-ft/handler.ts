import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { TransferFungibleTokenOutput } from './output';
import type {
  TransferFtBuildTransactionResult,
  TransferFtExecuteTransactionResult,
  TransferFtNormalizedParams,
  TransferFtSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';
import { isRawUnits } from '@/plugins/token/utils/token-amount-helpers';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TransferFungibleTokenInputSchema } from './input';

export class TransferFtCommand extends BaseTransactionCommand<
  TransferFtNormalizedParams,
  TransferFtBuildTransactionResult,
  TransferFtSignTransactionResult,
  TransferFtExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TransferFtNormalizedParams> {
    const { api, logger } = args;

    const tokenState = new ZustandTokenStateHelper(api.state, logger);

    const validArgs = TransferFungibleTokenInputSchema.parse(args.args);

    const tokenIdOrAlias = validArgs.token;
    const from = validArgs.from;
    const to = validArgs.to;
    const keyManagerArg = validArgs.keyManager;

    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManagerName>('default_key_manager');

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

    const resolvedFromAccount =
      await api.keyResolver.resolveAccountCredentialsWithFallback(
        from,
        keyManager,
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
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TransferFtNormalizedParams,
  ): Promise<TransferFtBuildTransactionResult> {
    const { api, logger } = args;
    logger.debug('Building transfer transaction body');
    const transaction = api.token.createTransferTransaction({
      tokenId: normalisedParams.tokenId,
      fromAccountId: normalisedParams.fromAccountId,
      toAccountId: normalisedParams.toAccountId,
      amount: normalisedParams.rawAmount,
    });
    return {
      transaction,
    };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TransferFtNormalizedParams,
    buildTransactionResult: TransferFtBuildTransactionResult,
  ): Promise<TransferFtSignTransactionResult> {
    const { api, logger } = args;
    const signerKeyRefId = normalisedParams.signerKeyRefId;
    logger.debug(`Using key ${signerKeyRefId} for signing transaction`);
    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [signerKeyRefId],
    );
    return {
      transaction,
    };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TransferFtNormalizedParams,
    buildTransactionResult: TransferFtBuildTransactionResult,
    signTransactionResult: TransferFtSignTransactionResult,
  ): Promise<TransferFtExecuteTransactionResult> {
    const { api } = args;
    void normalisedParams;
    void buildTransactionResult;
    const signedTransaction = signTransactionResult.transaction;
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
    args: CommandHandlerArgs,
    normalisedParams: TransferFtNormalizedParams,
    buildTransactionResult: TransferFtBuildTransactionResult,
    signTransactionResult: TransferFtSignTransactionResult,
    executeTransactionResult: TransferFtExecuteTransactionResult,
  ): Promise<CommandResult> {
    void args;
    void buildTransactionResult;
    void signTransactionResult;
    const outputData: TransferFungibleTokenOutput = {
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
