import type { Transaction } from '@hiero-ledger/sdk';

export interface BaseBuildTransactionResult {
  transaction: Transaction;
}

export interface BaseSignTransactionResult {
  signedTransaction: Transaction;
}

export interface BaseNormalizedParams {
  keyRefIds: string[];
}
