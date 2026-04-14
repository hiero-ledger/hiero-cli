import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

export interface BurnNftNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  serialNumbers: number[];
  currentTotalSupply: bigint;
  supplyKeyResolved: ResolvedPublicKey;
}

export interface BurnNftBuildTransactionResult extends BaseBuildTransactionResult {}
export interface BurnNftSignTransactionResult extends BaseSignTransactionResult {}
export interface BurnNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}
