import type {
  CreateTopicParams,
  DeleteTopicParams,
  MessageSubmitResult,
  SubmitMessageParams,
  TopicCreateResult,
  TopicUpdateResult,
  UpdateTopicParams,
  TopicDeleteResult,
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
   * Delete a topic on the Hedera network
   */
  deleteTopic(params: DeleteTopicParams): TopicDeleteResult;

  /**
   * Submit a message to a topic
   */
  submitMessage(params: SubmitMessageParams): MessageSubmitResult;

  updateTopic(params: UpdateTopicParams): TopicUpdateResult;
}
