import {
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
  adminKey?: string;
  submitKey?: string;
}

export interface SubmitMessageParams {
  topicId: string;
  message: string;
}
