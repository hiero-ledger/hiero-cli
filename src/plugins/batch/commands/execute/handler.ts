/**
 * Batch Execute Command Handler
 */
import type {
  CommandHandlerArgs,
  CommandResult,
  TransactionResult,
} from '@/core';
import type {
  BatchBuildTransactionResult,
  BatchNormalisedParams,
  BatchSignTransactionResult,
} from '@/plugins/batch/commands/execute/types';
import type { ExecuteBatchOutput } from './output';

import { Transaction } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { CredentialType } from '@/core/services/kms/kms-types.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

import { ExecuteBatchInputSchema } from './input';

export class ExecuteBatchCommand extends BaseTransactionCommand<
  BatchNormalisedParams,
  BatchBuildTransactionResult,
  BatchSignTransactionResult,
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
    console.log(key);
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
  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BatchNormalisedParams,
  ): Promise<BatchBuildTransactionResult> {
    void normalisedParams;
    const { api } = args;
    const innerTransactions = [...normalisedParams.batchData.transactions]
      .sort((a, b) => a.order - b.order)
      .map((txItem) => {
        return Transaction.fromBytes(
          Uint8Array.from(Buffer.from(txItem.transactionBytes, 'hex')),
        );
      });
    const batchKey = await api.keyResolver.getPublicKey(
      {
        type: CredentialType.KEY_REFERENCE,
        keyReference: normalisedParams.batchData.keyRefId,
        rawValue: normalisedParams.batchData.keyRefId,
      },
      'local',
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
    void normalisedParams;
    const batchKey = normalisedParams.batchData.keyRefId;
    console.log(batchKey);
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [batchKey],
    );
    return {
      transaction: signedTransaction,
    };
  }
  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BatchNormalisedParams,
    buildTransactionResult: BatchBuildTransactionResult,
    signTransactionResult: BatchSignTransactionResult,
  ): Promise<TransactionResult> {
    void normalisedParams;
    void buildTransactionResult;
    const { api } = args;
    const result = await api.txExecute.execute(
      signTransactionResult.transaction,
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
    buildTransactionResult: BatchBuildTransactionResult,
    signTransactionResult: BatchSignTransactionResult,
    executeTransactionResult: TransactionResult,
  ): Promise<CommandResult> {
    void args;
    void buildTransactionResult;
    void signTransactionResult;
    const outputData: ExecuteBatchOutput = {
      batchName: normalisedParams.name,
      transactionId: executeTransactionResult?.transactionId || '',
      success: executeTransactionResult?.success || false,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}
