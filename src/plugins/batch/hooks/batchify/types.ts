import type { Transaction } from '@hashgraph/sdk';

export interface BatchifyBuildTransactionResult {
  transaction: Transaction;
}

export interface BatchifySignTransactionResult {
  transaction: Transaction;
}
