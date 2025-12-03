import {
  CreateTopicParams,
  MessageSubmitResult,
  SubmitMessageParams,
  TopicCreateResult,
} from './types';

/**
 * Interface for Topic-related transaction operations
 * All topic transaction services must implement this interface
 */
export interface TopicService {
  /**
   * Create a new Hedera topic
   */
  createTopic(params: CreateTopicParams): TopicCreateResult;

  /**
   * Submit a message to a topic
   */
  submitMessage(params: SubmitMessageParams): MessageSubmitResult;
}
