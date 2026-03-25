import type { Transaction } from '@hashgraph/sdk';
import type { SupportedNetwork, TransactionResult } from '@/core';
import type { KmsCredentialRecord } from '@/core/services/kms/kms-types.interface';
import type { BatchData } from '@/plugins/batch/schema';

export interface BatchNormalisedParams {
  name: string;
  network: SupportedNetwork;
  batchId: string;
  batchData: BatchData;
  batchKey: KmsCredentialRecord;
  operatorKeyRefId: string;
}

export interface BatchBuildTransactionResult {
  transaction: Transaction;
}

export interface BatchSignTransactionResult {
  signedTransaction: Transaction;
}

export interface BatchExecuteTransactionResult {
  transactionResult: TransactionResult;
  updatedBatchData: BatchData;
}
