import type { Transaction as HederaTransaction } from '@hashgraph/sdk';
import type { TransactionResult } from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface CreateTopicNormalisedParams {
  memo?: string;
  alias?: string;
  keyManager: KeyManager;
  network: SupportedNetwork;
  adminKey?: ResolvedPublicKey;
  submitKey?: ResolvedPublicKey;
}

export interface CreateTopicBuildTransactionResult {
  transaction: HederaTransaction;
}

export interface CreateTopicSignTransactionResult {
  transaction: HederaTransaction;
}

export type CreateTopicExecuteTransactionResult = TransactionResult;
