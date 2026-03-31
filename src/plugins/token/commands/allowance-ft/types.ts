import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface TokenAllowanceFtNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  ownerAccountId: string;
  spenderAccountId: string;
  rawAmount: bigint;
  signerKeyRefId: string;
}

export interface TokenAllowanceFtBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenAllowanceFtSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenAllowanceFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}
