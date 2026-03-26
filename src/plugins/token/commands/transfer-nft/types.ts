import type { Transaction } from '@hashgraph/sdk';
import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface TransferNftNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  serials: number[];
  signerKeyRefId: string;
}

export interface TransferNftBuildTransactionResult extends BaseBuildTransactionResult {
  transaction: Transaction;
}

export interface TransferNftSignTransactionResult extends BaseSignTransactionResult {
  signedTransaction: Transaction;
}

export interface TransferNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}
