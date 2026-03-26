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

export interface TokenTransferFtBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenTransferFtSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenTransferFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}
