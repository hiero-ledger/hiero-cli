import type { Transaction } from '@hiero-ledger/sdk';
import type { TransactionResult } from './shared.types';

export interface BaseBuildTransactionResult {
  transaction: Transaction;
}

export interface BaseSignTransactionResult {
  signedTransaction: Transaction;
}

export interface BaseExecuteTransactionResult {
  transactionResult: TransactionResult;
}

export interface BaseNormalizedParams {
  keyRefIds: string[];
}
