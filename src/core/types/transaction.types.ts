import type { Transaction } from '@hashgraph/sdk';

export interface BaseBuildTransactionResult {
  transaction: Transaction;
}

export interface BaseSignTransactionResult {
  signedTransaction: Transaction;
}

export interface BaseNormalizedParams {
  keyRefIds: string[];
}
