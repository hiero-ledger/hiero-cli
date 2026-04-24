import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface BurnNftNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  serialNumbers: number[];
  currentTotalSupply: bigint;
}

export interface BurnNftBuildTransactionResult extends BaseBuildTransactionResult {}
export interface BurnNftSignTransactionResult extends BaseSignTransactionResult {}
export interface BurnNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}
