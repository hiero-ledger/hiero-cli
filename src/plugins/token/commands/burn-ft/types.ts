import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

export interface BurnFtNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  rawAmount: bigint;
  currentTotalSupply: bigint;
  supplyKeyResolved: ResolvedPublicKey;
}

export interface BurnFtBuildTransactionResult extends BaseBuildTransactionResult {}

export interface BurnFtSignTransactionResult extends BaseSignTransactionResult {}

export interface BurnFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}
