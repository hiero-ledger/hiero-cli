import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
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

export interface WipeFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}
