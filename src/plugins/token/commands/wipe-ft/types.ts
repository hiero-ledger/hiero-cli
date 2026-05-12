import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
} from '@/core';

export interface WipeFtNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  accountId: string;
  rawAmount: bigint;
  currentTotalSupply: bigint;
}

export interface WipeFtBuildTransactionResult extends BaseBuildTransactionResult {}

export interface WipeFtSignTransactionResult extends BaseSignTransactionResult {}

export interface WipeFtExecuteTransactionResult extends BaseExecuteTransactionResult {}
