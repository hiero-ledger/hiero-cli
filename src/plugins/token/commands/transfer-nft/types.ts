import type { Transaction } from '@hashgraph/sdk';
import type { SupportedNetwork, TransactionResult } from '@/core';

export interface TransferNftNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  serials: number[];
  signerKeyRefId: string;
}

export interface TransferNftBuildTransactionResult {
  transaction: Transaction;
}

export interface TransferNftSignTransactionResult {
  signedTransaction: Transaction;
}

export interface TransferNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}
