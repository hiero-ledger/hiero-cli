import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface UnpauseNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
}

export interface UnpauseBuildTransactionResult extends BaseBuildTransactionResult {}

export interface UnpauseSignTransactionResult extends BaseSignTransactionResult {}

export interface UnpauseExecuteTransactionResult {
  transactionResult: TransactionResult;
}
