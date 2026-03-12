/**
 * Batch Execute Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type {
  BatchBuildTransactionResult,
  BatchExecuteTransactionResult,
  BatchNormalisedParams,
  BatchSignTransactionResult,
} from '@/plugins/batch/commands/execute/types';
import type { ExecuteBatchOutput } from './output';

import { Transaction } from '@hashgraph/sdk';

import { ValidationError } from '@/core';
import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError } from '@/core/errors';
import {
  CredentialType,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

import { ExecuteBatchInputSchema } from './input';

export class ExecuteBatchCommand extends BaseTransactionCommand<
  BatchNormalisedParams,
  BatchBuildTransactionResult,
  BatchSignTransactionResult,
  BatchExecuteTransactionResult
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
      throw new NotFoundError(`Batch not found: ${name}`);
    }
    if (batchData.executed) {
      throw new ValidationError(`Batch "${name}" has been already executed `);
    }
    return {
      name,
      network,
      batchId: key,
      batchData,
    };
  }
  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BatchNormalisedParams,
  ): Promise<BatchBuildTransactionResult> {
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
      KeyManager.local,
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
    return {
      transaction: signedTransaction,
    };
  }
  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: BatchNormalisedParams,
    _buildTransactionResult: BatchBuildTransactionResult,
    signTransactionResult: BatchSignTransactionResult,
  ): Promise<BatchExecuteTransactionResult> {
    const { api, logger } = args;
    const batchState = new ZustandBatchStateHelper(api.state, logger);
    const result = await api.txExecute.execute(
      signTransactionResult.transaction,
    );
    let updatedBatchData = normalisedParams.batchData;
    if (!result.success) {
      updatedBatchData = {
        ...updatedBatchData,
        success: false,
        executed: true,
      };
    } else {
      updatedBatchData = {
        ...updatedBatchData,
        success: true,
        executed: true,
      };
    }
    batchState.saveBatch(normalisedParams.batchId, updatedBatchData);
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
    const outputData: ExecuteBatchOutput = {
      batchName: normalisedParams.name,
      transactionId:
        executeTransactionResult.transactionResult?.transactionId || '',
      success: executeTransactionResult.transactionResult?.success || false,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export async function executeBatch(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ExecuteBatchCommand().execute(args);
}
