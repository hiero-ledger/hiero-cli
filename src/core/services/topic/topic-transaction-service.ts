/**
 * Implementation of Topic Transaction Service
 * Handles topic creation and message submission
 */
import {
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  PublicKey,
  PrivateKey,
} from '@hashgraph/sdk';
import { TopicService } from './topic-transaction-service.interface';
import {
  CreateTopicParams,
  MessageSubmitResult,
  SubmitMessageParams,
  TopicCreateResult,
} from './types';

export class TopicServiceImpl implements TopicService {
  // Currently we only support DER formatted ECDSA private/public keys
  // @TODO Support for HEX format and ED25519 keys
  isPrivateKey(key: string): boolean {
    try {
      PrivateKey.fromStringDer(key);
      return true;
    } catch {
      return false;
    }
  }

  createKeyFromString(key: string) {
    const isKeyPrivate = this.isPrivateKey(key);

    if (isKeyPrivate) {
      return PrivateKey.fromStringDer(key);
    }

    return PublicKey.fromString(key);
  }

  createTopic(params: CreateTopicParams): TopicCreateResult {
    // Create the topic creation transaction
    const topicCreateTx = new TopicCreateTransaction();

    // Set memo if provided
    if (params.memo) {
      topicCreateTx.setTopicMemo(params.memo);
    }

    if (params.adminKey) {
      const adminKey = this.createKeyFromString(params.adminKey);
      topicCreateTx.setAdminKey(adminKey);
    }

    if (params.submitKey) {
      const submitKey = this.createKeyFromString(params.submitKey);
      topicCreateTx.setSubmitKey(submitKey);
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
