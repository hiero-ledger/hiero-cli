import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

export interface TokenMintNftNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  metadataBytes: Uint8Array;
  supplyKeyResolved: ResolvedPublicKey;
}

export interface TokenMintNftBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenMintNftSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenMintNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}
