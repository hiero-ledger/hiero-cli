import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
} from '@/core';

export interface TokenAllowanceFtNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  ownerAccountId: string;
  spenderAccountId: string;
  rawAmount: bigint;
  signerKeyRefId: string;
}

export interface TokenAllowanceFtBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenAllowanceFtSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenAllowanceFtExecuteTransactionResult extends BaseExecuteTransactionResult {}
