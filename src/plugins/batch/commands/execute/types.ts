import type { SupportedNetwork, TransactionResult } from '@/core';
import type { KmsCredentialRecord } from '@/core/services/kms/kms-types.interface';
import type {
  BaseBuildTransactionResult,
  BaseSignTransactionResult,
} from '@/core/types/transaction.types';
import type { BatchData } from '@/plugins/batch/schema';

export interface BatchNormalisedParams {
  name: string;
  network: SupportedNetwork;
  batchId: string;
  batchData: BatchData;
  batchKey: KmsCredentialRecord;
  operatorKeyRefId: string;
}

export interface BatchBuildTransactionResult extends BaseBuildTransactionResult {}

export interface BatchSignTransactionResult extends BaseSignTransactionResult {}

export interface BatchExecuteTransactionResult {
  transactionResult: TransactionResult;
  updatedBatchData: BatchData;
}
