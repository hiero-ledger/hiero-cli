import type {
  CreateBatchTransactionParams,
  CreateBatchTransactionResult,
} from '@/core/services/batch/types';

export interface BatchTransactionService {
  createBatchTransaction(
    params: CreateBatchTransactionParams,
  ): CreateBatchTransactionResult;
}
