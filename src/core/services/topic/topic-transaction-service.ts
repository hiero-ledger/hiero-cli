/**
 * Implementation of Topic Transaction Service
 * Handles topic creation and message submission
 */
import {
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from '@hashgraph/sdk';

import type { TopicService } from './topic-transaction-service.interface';
import type {
  CreateTopicParams,
  MessageSubmitResult,
  SubmitMessageParams,
  TopicCreateResult,
} from './types';

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
