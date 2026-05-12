import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
} from '@/core';

export interface RevokeKycNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  accountId: string;
}

export interface RevokeKycBuildTransactionResult extends BaseBuildTransactionResult {}

export interface RevokeKycSignTransactionResult extends BaseSignTransactionResult {}

export interface RevokeKycExecuteTransactionResult extends BaseExecuteTransactionResult {}
