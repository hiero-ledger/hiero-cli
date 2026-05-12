import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
} from '@/core';

export interface TokenDeleteNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  tokenName: string;
}

export interface TokenDeleteBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenDeleteSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenDeleteExecuteTransactionResult extends BaseExecuteTransactionResult {}
