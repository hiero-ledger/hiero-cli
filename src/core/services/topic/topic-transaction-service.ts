/**
 * Implementation of Topic Transaction Service
 * Handles topic creation and message submission
 */
import type { TopicService } from './topic-transaction-service.interface';
import type {
  CreateTopicParams,
  DeleteTopicParams,
  MessageSubmitResult,
  SubmitMessageParams,
  TopicCreateResult,
  TopicDeleteResult,
} from './types';

import {
  TopicCreateTransaction,
  TopicDeleteTransaction,
  TopicId,
  TopicMessageSubmitTransaction,
} from '@hashgraph/sdk';

import { ValidationError } from '@/core/errors';

export class TopicServiceImpl implements TopicService {
  createTopic(params: CreateTopicParams): TopicCreateResult {
    // Create the topic creation transaction
    const topicCreateTx = new TopicCreateTransaction();

    // Set memo if provided
    if (params.memo) {
      topicCreateTx.setTopicMemo(params.memo);
    }

    if (params.adminKey) {
      topicCreateTx.setAdminKey(params.adminKey);
    }

    if (params.submitKey) {
      topicCreateTx.setSubmitKey(params.submitKey);
    }

    const resultResponse: TopicCreateResult = {
      transaction: topicCreateTx,
    };

    return resultResponse;
  }

  deleteTopic(params: DeleteTopicParams): TopicDeleteResult {
    try {
      const transaction = new TopicDeleteTransaction().setTopicId(
        TopicId.fromString(params.topicId),
      );
      return { transaction };
    } catch (error) {
      throw new ValidationError('Invalid topic ID for delete', {
        context: { topicId: params.topicId },
        cause: error,
      });
    }
  }

  submitMessage(params: SubmitMessageParams): MessageSubmitResult {
    // Create the message submission transaction
    const submitMessageTx = new TopicMessageSubmitTransaction({
      topicId: params.topicId,
      message: params.message,
    });

    return {
      transaction: submitMessageTx,
    };
  }
}
