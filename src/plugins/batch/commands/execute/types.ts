import type { Transaction } from '@hashgraph/sdk';
import type { SupportedNetwork, TransactionResult } from '@/core';
import type { BatchData } from '@/plugins/batch/schema';

export interface BatchNormalisedParams {
  name: string;
  network: SupportedNetwork;
  batchId: string;
  batchData: BatchData;
}

export interface BatchBuildTransactionResult {
  transaction: Transaction;
}

export interface BatchSignTransactionResult {
  transaction: Transaction;
}

export interface BatchExecuteTransactionResult {
  transactionResult: TransactionResult;
  updatedBatchData: BatchData;
}
