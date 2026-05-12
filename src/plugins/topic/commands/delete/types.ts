import type { Transaction } from '@hiero-ledger/sdk';
import type { BaseExecuteTransactionResult } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TopicData } from '@/plugins/topic/schema';

export interface DeleteTopicNormalisedParams {
  topicRef: string;
  network: SupportedNetwork;
  key: string;
  topicToDelete: TopicData;
  stateOnly: boolean;
  signingKeyRefIds: string[];
}

export interface DeleteTopicBuildTransactionResult {
  transaction: Transaction;
}

export interface DeleteTopicSignTransactionResult {
  signedTransaction: Transaction;
}

export interface DeleteTopicExecuteTransactionResult extends BaseExecuteTransactionResult {}
