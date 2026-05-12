import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
} from '@/core';

export interface PauseNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
}

export interface PauseBuildTransactionResult extends BaseBuildTransactionResult {}

export interface PauseSignTransactionResult extends BaseSignTransactionResult {}

export interface PauseExecuteTransactionResult extends BaseExecuteTransactionResult {}
