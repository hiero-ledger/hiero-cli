import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
} from '@/core';

export interface UnpauseNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
}

export interface UnpauseBuildTransactionResult extends BaseBuildTransactionResult {}

export interface UnpauseSignTransactionResult extends BaseSignTransactionResult {}

export interface UnpauseExecuteTransactionResult extends BaseExecuteTransactionResult {}
