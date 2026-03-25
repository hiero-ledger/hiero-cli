import type { Transaction } from '@hashgraph/sdk';
import type {
  BatchifyBuildTransactionResult,
  BatchifyNormalizedParams,
  BatchifySignTransactionResult,
  TransactionResult,
} from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface CreateTopicNormalisedParams extends BatchifyNormalizedParams {
  memo?: string;
  alias?: string;
  keyManager: KeyManager;
  network: SupportedNetwork;
  adminKeys: ResolvedPublicKey[];
  submitKeys: ResolvedPublicKey[];
  adminKeyThreshold: number;
  submitKeyThreshold: number;
}

export interface CreateTopicBuildTransactionResult extends BatchifyBuildTransactionResult {
  transaction: Transaction;
}

export interface CreateTopicSignTransactionResult extends BatchifySignTransactionResult {
  signedTransaction: Transaction;
}

export type CreateTopicExecuteTransactionResult = TransactionResult;
