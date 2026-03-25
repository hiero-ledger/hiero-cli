import type { Transaction } from '@hashgraph/sdk';
import type {
  BatchifyBuildTransactionResult,
  BatchifyNormalizedParams,
  BatchifySignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface TokenTransferFtNormalizedParams extends BatchifyNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  rawAmount: bigint;
  signerKeyRefId: string;
}

export interface TokenTransferFtBuildTransactionResult extends BatchifyBuildTransactionResult {
  transaction: Transaction;
}

export interface TokenTransferFtSignTransactionResult extends BatchifySignTransactionResult {
  signedTransaction: Transaction;
}

export interface TokenTransferFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}
