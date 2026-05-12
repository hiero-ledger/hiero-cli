import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
} from '@/core';

export interface UnfreezeNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  accountId: string;
}

export interface UnfreezeBuildTransactionResult extends BaseBuildTransactionResult {}

export interface UnfreezeSignTransactionResult extends BaseSignTransactionResult {}

export interface UnfreezeExecuteTransactionResult extends BaseExecuteTransactionResult {}
