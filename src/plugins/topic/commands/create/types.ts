import type { Transaction } from '@hashgraph/sdk';
import type { TransactionResult } from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface CreateTopicNormalisedParams {
  memo?: string;
  alias?: string;
  keyManager: KeyManagerName;
  network: SupportedNetwork;
  adminKeys: ResolvedPublicKey[];
  submitKeys: ResolvedPublicKey[];
}

export interface CreateTopicBuildTransactionResult {
  transaction: Transaction;
}

export interface CreateTopicSignTransactionResult {
  signedTransaction: Transaction;
}

export type CreateTopicExecuteTransactionResult = TransactionResult;
