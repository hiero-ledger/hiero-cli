import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface WipeNftNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  accountId: string;
  serialNumbers: number[];
  currentTotalSupply: bigint;
}

export interface WipeNftBuildTransactionResult extends BaseBuildTransactionResult {}

export interface WipeNftSignTransactionResult extends BaseSignTransactionResult {}

export interface WipeNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}
