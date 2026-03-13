import type { Transaction } from '@hashgraph/sdk';
import type { SupportedNetwork, TransactionResult } from '@/core';

export interface TransferFtNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  rawAmount: bigint;
  signerKeyRefId: string;
}

export interface TransferFtBuildTransactionResult {
  transaction: Transaction;
}

export interface TransferFtSignTransactionResult {
  signedTransaction: Transaction;
}

export interface TransferFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}
