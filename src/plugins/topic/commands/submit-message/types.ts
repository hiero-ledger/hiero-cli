import type { Transaction as Transaction } from '@hashgraph/sdk';
import type {
  BatchifyBuildTransactionResult,
  BatchifyNormalizedParams,
  BatchifySignTransactionResult,
  TransactionResult,
} from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TopicData } from '@/plugins/topic/schema';

export interface SubmitMessageNormalisedParams extends BatchifyNormalizedParams {
  topicId: string;
  message: string;
  signerKeyRefIds: string[];
  keyManager: KeyManager;
  currentNetwork: SupportedNetwork;
  topicData: TopicData;
}

export interface SubmitMessageBuildTransactionResult extends BatchifyBuildTransactionResult {
  transaction: Transaction;
}

export interface SubmitMessageSignTransactionResult extends BatchifySignTransactionResult {
  signedTransaction: Transaction;
}

export type SubmitMessageExecuteTransactionResult = TransactionResult;
