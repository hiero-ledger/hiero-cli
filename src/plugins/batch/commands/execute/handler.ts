/**
 * Batch Execute Command Handler
 */
import type {
  CommandHandlerArgs,
  CommandResult,
  TransactionResult,
} from '@/core';
import type {
  BatchBuildAndSignResult,
  BatchNormalisedParams,
} from '@/plugins/batch/commands/execute/types';
import type { ExecuteBatchOutput } from './output';

import { Transaction } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

import { ExecuteBatchInputSchema } from './input';

export class ExecuteBatchCommand extends BaseTransactionCommand<
  BatchNormalisedParams,
  BatchBuildAndSignResult,
  TransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<BatchNormalisedParams> {
    const { api, logger } = args;
    const batchState = new ZustandBatchStateHelper(api.state, logger);
    const validArgs = ExecuteBatchInputSchema.parse(args.args);
    const name = validArgs.name;
    const network = api.network.getCurrentNetwork();
    const key = composeKey(network, name);
    const batchData = batchState.getBatch(key);
    if (!batchData) {
      throw new NotFoundError(`Batch not found: ${validArgs.name}`);
    }
    return {
      name,
      network,
      batchData,
    };
  }
  async buildAndSign(
    args: CommandHandlerArgs,
    normalisedParams: BatchNormalisedParams,
  ): Promise<BatchBuildAndSignResult> {
    void normalisedParams;
    const { api } = args;
    const innerTransactions = [...normalisedParams.batchData.transactions]
      .sort((a, b) => a.order - b.order)
      .map((txItem) => {
        return Transaction.fromBytes(
          //@todo ensure that transaction will be stored in hex format
          Uint8Array.from(Buffer.from(txItem.transactionBytes, 'hex')),
        );
      });
    const result = api.batch.createBatchTransaction({
      transactions: innerTransactions,
    });
    return { transaction: result.transaction };
  }
  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BatchNormalisedParams,
    buildAndSignResult: BatchBuildAndSignResult,
  ): Promise<TransactionResult> {
    const { api } = args;
    const batchKey = normalisedParams.batchData.keyRefId;
    const result = await api.txExecution.signAndExecuteWith(
      buildAndSignResult.transaction,
      [batchKey],
    );
    if (!result.success) {
      throw new TransactionError(
        `Failed to execute batch (txId: ${result.transactionId})`,
        false,
      );
    }
    return result;
  }
  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: BatchNormalisedParams,
    transactionExecutionResult: TransactionResult | undefined,
  ): Promise<CommandResult> {
    void args;
    const outputData: ExecuteBatchOutput = {
      batchName: normalisedParams.name,
      transactionId: transactionExecutionResult?.transactionId || '',
      success: transactionExecutionResult?.success || false,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}
