import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface GrantKycNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  accountId: string;
}

export interface GrantKycBuildTransactionResult extends BaseBuildTransactionResult {}

export interface GrantKycSignTransactionResult extends BaseSignTransactionResult {}

export interface GrantKycExecuteTransactionResult {
  transactionResult: TransactionResult;
}
