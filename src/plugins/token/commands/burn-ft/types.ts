import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
} from '@/core';

export interface BurnFtNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  rawAmount: bigint;
  currentTotalSupply: bigint;
}

export interface BurnFtBuildTransactionResult extends BaseBuildTransactionResult {}

export interface BurnFtSignTransactionResult extends BaseSignTransactionResult {}

export interface BurnFtExecuteTransactionResult extends BaseExecuteTransactionResult {}
