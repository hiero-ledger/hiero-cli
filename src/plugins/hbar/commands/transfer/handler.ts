import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { TransferOutput } from './output';
import type {
  TransferBuildTransactionResult,
  TransferExecuteTransactionResult,
  TransferNormalisedParams,
  TransferSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { TransactionError, ValidationError } from '@/core/errors';
import { HBAR_DECIMALS } from '@/core/shared/constants';
import { processBalanceInput } from '@/core/utils/process-balance-input';

import { TransferInputSchema } from './input';

export class TransferCommand extends BaseTransactionCommand<
  TransferNormalisedParams,
  TransferBuildTransactionResult,
  TransferSignTransactionResult,
  TransferExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TransferNormalisedParams> {
    const { api, logger } = args;

    logger.info('[HBAR] Transfer command invoked');

    const validArgs = TransferInputSchema.parse(args.args);

    const to = validArgs.to;
    const from = validArgs.from;
    const memo = validArgs.memo;

    const providedKeyManager = validArgs.keyManager;
    const keyManager =
      providedKeyManager ||
      api.config.getOption<KeyManagerName>('default_key_manager');

    const amount = processBalanceInput(validArgs.amount, HBAR_DECIMALS);
    const currentNetwork = api.network.getCurrentNetwork();

    const fromAccount =
      await api.keyResolver.resolveAccountCredentialsWithFallback(
        from,
        keyManager,
      );
    const toAccount = await api.keyResolver.resolveDestination(to, keyManager);

    // In resolved destination at least one field is present
    const destination = toAccount.evmAddress || <string>toAccount.accountId;

    if (fromAccount.accountId === toAccount.accountId) {
      throw new ValidationError('Cannot transfer to the same account');
    }

    return {
      amount,
      memo,
      keyManager,
      fromAccount,
      destination,
      currentNetwork,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TransferNormalisedParams,
  ): Promise<TransferBuildTransactionResult> {
    const { api, logger } = args;

    logger.info(
      `[HBAR] Transferring ${normalisedParams.amount.toString()} tinybars from ${normalisedParams.fromAccount.accountId} to ${normalisedParams.destination}`,
    );

    const transferResult = await api.hbar.transferTinybar({
      amount: normalisedParams.amount,
      from: normalisedParams.fromAccount.accountId,
      to: normalisedParams.destination,
      memo: normalisedParams.memo,
    });

    return { transaction: transferResult.transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TransferNormalisedParams,
    buildTransactionResult: TransferBuildTransactionResult,
  ): Promise<TransferSignTransactionResult> {
    const signedTransaction = await args.api.txSign.sign(
      buildTransactionResult.transaction,
      [normalisedParams.fromAccount.keyRefId],
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TransferNormalisedParams,
    _buildTransactionResult: TransferBuildTransactionResult,
    signTransactionResult: TransferSignTransactionResult,
  ): Promise<TransferExecuteTransactionResult> {
    const result = await args.api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `Transfer failed from ${normalisedParams.fromAccount.accountId} to ${normalisedParams.destination} (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
      );
    }

    return result;
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: TransferNormalisedParams,
    _buildTransactionResult: TransferBuildTransactionResult,
    _signTransactionResult: TransferSignTransactionResult,
    executeTransactionResult: TransferExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { logger } = args;

    logger.info(
      `[HBAR] Transfer submitted successfully, txId=${executeTransactionResult.transactionId}`,
    );

    const outputData: TransferOutput = {
      transactionId: executeTransactionResult.transactionId || '',
      fromAccountId: normalisedParams.fromAccount.accountId,
      toAccountId: normalisedParams.destination,
      amountTinybar: normalisedParams.amount,
      network: normalisedParams.currentNetwork,
      ...(normalisedParams.memo && { memo: normalisedParams.memo }),
      ...(executeTransactionResult.receipt?.status && {
        status: executeTransactionResult.receipt.status.status,
      }),
    };

    return { result: outputData };
  }
}
