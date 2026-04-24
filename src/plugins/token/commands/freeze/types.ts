import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface FreezeNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  accountId: string;
}

export interface FreezeBuildTransactionResult extends BaseBuildTransactionResult {}

export interface FreezeSignTransactionResult extends BaseSignTransactionResult {}

export interface FreezeExecuteTransactionResult {
  transactionResult: TransactionResult;
}
