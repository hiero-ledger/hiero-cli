import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface TokenDeleteNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  tokenName: string;
  signingKeyRefIds: string[];
}

export interface TokenDeleteBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenDeleteSignTransactionResult extends BaseSignTransactionResult {}

export type TokenDeleteExecuteTransactionResult = TransactionResult;
