import type { Transaction } from '@hashgraph/sdk';
import type {
  BatchifyBuildTransactionResult,
  BatchifyNormalizedParams,
  BatchifySignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface TransferNftNormalizedParams extends BatchifyNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  serials: number[];
  signerKeyRefId: string;
}

export interface TransferNftBuildTransactionResult extends BatchifyBuildTransactionResult {
  transaction: Transaction;
}

export interface TransferNftSignTransactionResult extends BatchifySignTransactionResult {
  signedTransaction: Transaction;
}

export interface TransferNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}
