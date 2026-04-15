import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

export interface FreezeNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  accountId: string;
  freezeKeyResolved: ResolvedPublicKey;
}

export interface FreezeBuildTransactionResult extends BaseBuildTransactionResult {}

export interface FreezeSignTransactionResult extends BaseSignTransactionResult {}

export interface FreezeExecuteTransactionResult {
  transactionResult: TransactionResult;
}
