import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
} from '@/core';

export interface MintFtNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  rawAmount: bigint;
}

export interface MintFtBuildTransactionResult extends BaseBuildTransactionResult {}

export interface MintFtSignTransactionResult extends BaseSignTransactionResult {}

export interface MintFtExecuteTransactionResult extends BaseExecuteTransactionResult {}
