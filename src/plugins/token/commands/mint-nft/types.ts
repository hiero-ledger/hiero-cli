import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface TokenMintNftNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  metadataBytes: Uint8Array;
}

export interface TokenMintNftBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenMintNftSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenMintNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}
