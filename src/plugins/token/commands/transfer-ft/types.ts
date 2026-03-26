import type { Transaction } from '@hashgraph/sdk';
import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface TokenTransferFtNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  rawAmount: bigint;
  signerKeyRefId: string;
}

export interface TokenTransferFtBuildTransactionResult extends BaseBuildTransactionResult {
  transaction: Transaction;
}

export interface TokenTransferFtSignTransactionResult extends BaseSignTransactionResult {
  signedTransaction: Transaction;
}

export interface TokenTransferFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}
