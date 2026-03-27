import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

export interface TokenDeleteNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  tokenName: string;
  adminKeyResolved: ResolvedPublicKey;
}

export interface TokenDeleteBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenDeleteSignTransactionResult extends BaseSignTransactionResult {}

export type TokenDeleteExecuteTransactionResult = TransactionResult;
