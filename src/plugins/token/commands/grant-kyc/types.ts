import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
} from '@/core';

export interface GrantKycNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  accountId: string;
}

export interface GrantKycBuildTransactionResult extends BaseBuildTransactionResult {}

export interface GrantKycSignTransactionResult extends BaseSignTransactionResult {}

export interface GrantKycExecuteTransactionResult extends BaseExecuteTransactionResult {}
