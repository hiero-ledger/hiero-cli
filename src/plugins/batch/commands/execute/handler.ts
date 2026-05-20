import type { CommandHandlerArgs, CommandResult } from '@/core';
import type {
  BatchBuildTransactionResult,
  BatchExecuteTransactionResult,
  BatchNormalisedParams,
  BatchSignTransactionResult,
} from '@/plugins/batch/commands/execute/types';
import type { BatchStateService } from '@/plugins/batch/services/batch-state.service.interface';
import type { BatchExecuteOutput } from './output';

import { Transaction } from '@hiero-ledger/sdk';

import { ValidationError } from '@/core';
import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError } from '@/core/errors';
import { OrchestratorSource } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { BatchStateServiceImpl } from '@/plugins/batch/services/batch-state.service';

import { BatchExecuteInputSchema } from './input';

export const BATCH_EXECUTE_COMMAND_NAME = 'batch_execute';

export class BatchExecuteCommand extends BaseTransactionCommand<
  BatchNormalisedParams,
  BatchBuildTransactionResult,
  BatchSignTransactionResult,
  BatchExecuteTransactionResult
> {
  constructor(private readonly batchState: BatchStateService) {
    super(BATCH_EXECUTE_COMMAND_NAME);
  }

  protected override mapExecuteResultForHooks(
    executeTransactionResult: BatchExecuteTransactionResult,
  ): unknown {
    return {
      source: OrchestratorSource.BATCH,
      batchData: executeTransactionResult.updatedBatchData,
    };
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<BatchNormalisedParams> {
    const { api } = args;
    const validArgs = BatchExecuteInputSchema.parse(args.args);
    const name = validArgs.name;
    const network = api.network.getCurrentNetwork();
    const key = composeKey(network, name);

    const batchData = this.batchState.getBatch(key);
    if (!batchData) {
      throw new NotFoundError(`Batch not found: ${name}`);
    }
    if (batchData.executed) {
      throw new ValidationError(`Batch "${name}" has been already executed `);
    }

    const operator = api.network.getOperator(network);
    if (!operator) {
      throw new NotFoundError(`Operator not found current network ${network}`);
    }

    const batchKey = api.kms.get(batchData.keyRefId);
    if (!batchKey) {
      throw new NotFoundError(`Batch key not found ${batchData.keyRefId}`);
    }

    return {
      name,
      network,
      batchId: key,
      batchData,
      batchKey,
      operatorKeyRefId: operator.keyRefId,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BatchNormalisedParams,
  ): Promise<BatchBuildTransactionResult> {
    const { api } = args;
    const batchKey = normalisedParams.batchKey;
    const operatorKeyRefId = normalisedParams.operatorKeyRefId;
    const signingKeys = [batchKey.keyRefId, operatorKeyRefId];

    const innerTransactions = await Promise.all(
      normalisedParams.batchData.transactions
        .sort((a, b) => a.order - b.order)
        .map(async (txItem) => {
          const transaction = Transaction.fromBytes(
            Uint8Array.from(Buffer.from(txItem.transactionBytes, 'hex')),
          );
          txItem.transactionId = transaction.transactionId?.toString();

          const alreadySignedBy = txItem.keyRefIds;
          const uniqueKeyRefs = signingKeys.filter(
            (k) => !alreadySignedBy.includes(k),
          );

          return api.txSign.sign(transaction, [...uniqueKeyRefs]);
        }),
    );

    const result = api.batch.createBatchTransaction({
      transactions: innerTransactions,
      batchKey: batchKey.publicKey,
    });
    return { transaction: result.transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BatchNormalisedParams,
    buildTransactionResult: BatchBuildTransactionResult,
  ): Promise<BatchSignTransactionResult> {
    const { api } = args;
    const batchKey = normalisedParams.batchData.keyRefId;
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [batchKey],
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BatchNormalisedParams,
    _buildTransactionResult: BatchBuildTransactionResult,
    signTransactionResult: BatchSignTransactionResult,
  ): Promise<BatchExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    const updatedBatchData = {
      ...normalisedParams.batchData,
      success: result.success,
      executed: true,
    };

    this.batchState.saveBatch(normalisedParams.batchId, updatedBatchData);

    return {
      transactionResult: result,
      updatedBatchData,
    };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: BatchNormalisedParams,
    _buildTransactionResult: BatchBuildTransactionResult,
    _signTransactionResult: BatchSignTransactionResult,
    executeTransactionResult: BatchExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: BatchExecuteOutput = {
      batchName: normalisedParams.name,
      transactionId:
        executeTransactionResult.transactionResult?.transactionId || '',
      success: executeTransactionResult.transactionResult?.success || false,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export async function batchExecute(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  const batchState = new BatchStateServiceImpl(api.state, api.logger);
  return new BatchExecuteCommand(batchState).execute(args);
}
