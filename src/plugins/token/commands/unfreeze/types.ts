import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

export interface UnfreezeNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  accountId: string;
  freezeKeyResolved: ResolvedPublicKey;
}

export interface UnfreezeBuildTransactionResult extends BaseBuildTransactionResult {}

export interface UnfreezeSignTransactionResult extends BaseSignTransactionResult {}

export interface UnfreezeExecuteTransactionResult {
  transactionResult: TransactionResult;
}
