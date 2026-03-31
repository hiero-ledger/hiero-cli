import type {
  Key,
  TopicCreateTransaction,
  TopicDeleteTransaction,
  TopicMessageSubmitTransaction,
  TopicUpdateTransaction,
} from '@hashgraph/sdk';

export interface TopicCreateResult {
  transaction: TopicCreateTransaction;
}

export interface TopicDeleteResult {
  transaction: TopicDeleteTransaction;
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

export interface UpdateTopicParams {
  topicId: string;
  memo?: string | null;
  adminKey?: Key;
  submitKey?: Key | null;
  autoRenewAccountId?: string | null;
  autoRenewPeriod?: number;
  expirationTime?: Date;
}

export interface TopicUpdateResult {
  transaction: TopicUpdateTransaction;
}

export interface DeleteTopicParams {
  topicId: string;
}
