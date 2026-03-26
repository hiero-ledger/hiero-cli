import type { Transaction } from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';
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

export type DeleteTopicExecuteTransactionResult = TransactionResult;
