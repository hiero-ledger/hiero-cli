import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface MintFtNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  rawAmount: bigint;
  signingKeyRefIds: string[];
}

export interface MintFtBuildTransactionResult extends BaseBuildTransactionResult {}

export interface MintFtSignTransactionResult extends BaseSignTransactionResult {}

export interface MintFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}
