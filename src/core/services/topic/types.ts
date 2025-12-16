import type {
  Key,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from '@hashgraph/sdk';

export interface TopicCreateResult {
  transaction: TopicCreateTransaction;
}

export interface MessageSubmitResult {
  transaction: TopicMessageSubmitTransaction;
  sequenceNumber?: number;
}

// Parameter types for topic operations
export interface CreateTopicParams {
  memo?: string;
  adminKey?: Key;
  submitKey?: Key;
}

export interface SubmitMessageParams {
  topicId: string;
  message: string;
}
