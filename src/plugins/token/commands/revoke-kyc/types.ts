import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface RevokeKycNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  accountId: string;
}

export interface RevokeKycBuildTransactionResult extends BaseBuildTransactionResult {}

export interface RevokeKycSignTransactionResult extends BaseSignTransactionResult {}

export interface RevokeKycExecuteTransactionResult {
  transactionResult: TransactionResult;
}
