import type { Transaction } from '@hashgraph/sdk';
import type { TransactionResult } from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TopicData } from '@/plugins/topic/schema';

export interface UpdateTopicNormalisedParams {
  topicId: string;
  stateKey: string;
  network: SupportedNetwork;
  keyManager: KeyManager;
  existingTopicData: TopicData;
  memo?: string | null;
  newAdminKeys?: ResolvedPublicKey[];
  newSubmitKeys?: ResolvedPublicKey[] | null;
  newAdminKeyThreshold?: number;
  newSubmitKeyThreshold?: number;
  autoRenewAccountId?: string | null;
  autoRenewPeriod?: number;
  expirationTime?: string;
  currentAdminKeyRefIds: string[];
  isExpirationOnlyUpdate: boolean;
}

export interface UpdateTopicBuildTransactionResult {
  transaction: Transaction;
}

export interface UpdateTopicSignTransactionResult {
  signedTransaction: Transaction;
}

export type UpdateTopicExecuteTransactionResult = TransactionResult;
