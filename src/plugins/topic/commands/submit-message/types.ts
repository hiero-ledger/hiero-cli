import type { Transaction as Transaction } from '@hashgraph/sdk';
import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  TransactionResult,
} from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TopicData } from '@/plugins/topic/schema';

export interface SubmitMessageNormalisedParams extends BaseNormalizedParams {
  topicId: string;
  message: string;
  signerKeyRefIds: string[];
  keyManager: KeyManager;
  currentNetwork: SupportedNetwork;
  topicData: TopicData;
}

export interface SubmitMessageBuildTransactionResult extends BaseBuildTransactionResult {
  transaction: Transaction;
}

export interface SubmitMessageSignTransactionResult extends BaseSignTransactionResult {
  signedTransaction: Transaction;
}

export type SubmitMessageExecuteTransactionResult = TransactionResult;
