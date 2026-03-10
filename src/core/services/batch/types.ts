import type { BatchTransaction, Transaction } from '@hashgraph/sdk';

export interface CreateBatchTransactionResult {
  transaction: BatchTransaction;
}

// Parameter types for account operations
export interface CreateBatchTransactionParams {
  transactions: Transaction[];
  batchKey: string;
}
