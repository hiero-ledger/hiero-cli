import type { Transaction } from '@hashgraph/sdk';
import type { SupportedNetwork, TransactionResult } from '@/core';

export interface TokenTransferFtNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  rawAmount: bigint;
  signerKeyRefId: string;
}

export interface TokenTransferFtBuildTransactionResult {
  transaction: Transaction;
}

export interface TokenTransferFtSignTransactionResult {
  signedTransaction: Transaction;
}

export interface TokenTransferFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}
