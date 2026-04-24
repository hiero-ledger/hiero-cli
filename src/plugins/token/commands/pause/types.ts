import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface PauseNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
}

export interface PauseBuildTransactionResult extends BaseBuildTransactionResult {}

export interface PauseSignTransactionResult extends BaseSignTransactionResult {}

export interface PauseExecuteTransactionResult {
  transactionResult: TransactionResult;
}
