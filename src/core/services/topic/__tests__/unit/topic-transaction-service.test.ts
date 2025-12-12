/**
 * Unit tests for TopicServiceImpl
 * Tests topic creation and message submission
 */
import { TopicServiceImpl } from '@/core/services/topic/topic-transaction-service';

import {
  createCreateTopicParams,
  createMockPublicKey,
  createMockTopicCreateTransaction,
  createMockTopicMessageSubmitTransaction,
  createSubmitMessageParams,
} from './mocks';

const mockTopicCreateTx = createMockTopicCreateTransaction();
const mockPublicKey = createMockPublicKey();

jest.mock('@hashgraph/sdk', () => ({
  TopicCreateTransaction: jest.fn(() => mockTopicCreateTx),
  TopicMessageSubmitTransaction: jest.fn((params) =>
    createMockTopicMessageSubmitTransaction(params),
  ),
}));

describe('TopicServiceImpl', () => {
  let topicService: TopicServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    topicService = new TopicServiceImpl();
  });

  describe('createTopic', () => {
    it('should create topic without optional parameters', () => {
      const { TopicCreateTransaction } = jest.requireMock('@hashgraph/sdk');
      const params = createCreateTopicParams();

      const result = topicService.createTopic(params);

      expect(TopicCreateTransaction).toHaveBeenCalledTimes(1);
      expect(mockTopicCreateTx.setTopicMemo).not.toHaveBeenCalled();
      expect(mockTopicCreateTx.setAdminKey).not.toHaveBeenCalled();
      expect(mockTopicCreateTx.setSubmitKey).not.toHaveBeenCalled();
      expect(result.transaction).toBe(mockTopicCreateTx);
    });

    it('should create topic with memo only', () => {
      const params = createCreateTopicParams({ memo: 'Test Topic Memo' });

      const result = topicService.createTopic(params);

      expect(mockTopicCreateTx.setTopicMemo).toHaveBeenCalledWith(
        'Test Topic Memo',
      );
      expect(mockTopicCreateTx.setAdminKey).not.toHaveBeenCalled();
      expect(mockTopicCreateTx.setSubmitKey).not.toHaveBeenCalled();
      expect(result.transaction).toBe(mockTopicCreateTx);
    });

    it('should create topic with admin key', () => {
      const params = createCreateTopicParams({
        adminKey: mockPublicKey,
      });

      const result = topicService.createTopic(params);

      expect(mockTopicCreateTx.setAdminKey).toHaveBeenCalledWith(mockPublicKey);
      expect(mockTopicCreateTx.setSubmitKey).not.toHaveBeenCalled();
      expect(result.transaction).toBe(mockTopicCreateTx);
    });

    it('should create topic with submit key', () => {
      const params = createCreateTopicParams({
        submitKey: mockPublicKey,
      });

      const result = topicService.createTopic(params);

      expect(mockTopicCreateTx.setSubmitKey).toHaveBeenCalledWith(
        mockPublicKey,
      );
      expect(mockTopicCreateTx.setAdminKey).not.toHaveBeenCalled();
      expect(result.transaction).toBe(mockTopicCreateTx);
    });

    it('should create topic with both admin and submit keys', () => {
      const params = createCreateTopicParams({
        adminKey: mockPublicKey,
        submitKey: mockPublicKey,
      });

      const result = topicService.createTopic(params);

      expect(mockTopicCreateTx.setAdminKey).toHaveBeenCalledWith(mockPublicKey);
      expect(mockTopicCreateTx.setSubmitKey).toHaveBeenCalledWith(
        mockPublicKey,
      );
      expect(result.transaction).toBe(mockTopicCreateTx);
    });

    it('should create topic with all optional parameters', () => {
      const params = createCreateTopicParams({
        memo: 'Full Topic',
        adminKey: mockPublicKey,
        submitKey: mockPublicKey,
      });

      const result = topicService.createTopic(params);

      expect(mockTopicCreateTx.setTopicMemo).toHaveBeenCalledWith('Full Topic');
      expect(mockTopicCreateTx.setAdminKey).toHaveBeenCalledWith(mockPublicKey);
      expect(mockTopicCreateTx.setSubmitKey).toHaveBeenCalledWith(
        mockPublicKey,
      );
      expect(result.transaction).toBe(mockTopicCreateTx);
    });

    it('should handle empty string memo', () => {
      const params = createCreateTopicParams({ memo: '' });

      const result = topicService.createTopic(params);

      expect(mockTopicCreateTx.setTopicMemo).not.toHaveBeenCalled();
      expect(result.transaction).toBe(mockTopicCreateTx);
    });

    it('should handle very long memo string', () => {
      const longMemo = 'x'.repeat(1000);
      const params = createCreateTopicParams({ memo: longMemo });

      const result = topicService.createTopic(params);

      expect(mockTopicCreateTx.setTopicMemo).toHaveBeenCalledWith(longMemo);
      expect(result.transaction).toBe(mockTopicCreateTx);
    });
  });

  describe('submitMessage', () => {
    it('should create message submit transaction with valid topicId and message', () => {
      const { TopicMessageSubmitTransaction } =
        jest.requireMock('@hashgraph/sdk');
      const params = createSubmitMessageParams();

      const result = topicService.submitMessage(params);

      expect(TopicMessageSubmitTransaction).toHaveBeenCalledWith({
        topicId: '0.0.1001',
        message: 'Test message',
      });
      expect(result.transaction).toBeDefined();
      expect(result.transaction.topicId).toBe('0.0.1001');
      expect(result.transaction.message).toBe('Test message');
    });

    it('should handle empty message string', () => {
      const { TopicMessageSubmitTransaction } =
        jest.requireMock('@hashgraph/sdk');
      const params = createSubmitMessageParams({ message: '' });

      const result = topicService.submitMessage(params);

      expect(TopicMessageSubmitTransaction).toHaveBeenCalledWith({
        topicId: '0.0.1001',
        message: '',
      });
      expect(result.transaction.message).toBe('');
    });

    it('should handle long message string', () => {
      const longMessage = 'x'.repeat(5000);
      const params = createSubmitMessageParams({ message: longMessage });

      const result = topicService.submitMessage(params);

      expect(result.transaction.message).toBe(longMessage);
    });

    it('should return transaction with correct topicId', () => {
      const params = createSubmitMessageParams({ topicId: '0.0.9999' });

      const result = topicService.submitMessage(params);

      expect(result.transaction.topicId).toBe('0.0.9999');
    });

    it('should accept different topicId formats', () => {
      const params1 = createSubmitMessageParams({ topicId: '0.0.123' });
      const params2 = createSubmitMessageParams({ topicId: '0.0.999999' });

      const result1 = topicService.submitMessage(params1);
      const result2 = topicService.submitMessage(params2);

      expect(result1.transaction.topicId).toBe('0.0.123');
      expect(result2.transaction.topicId).toBe('0.0.999999');
    });

    it('should handle special characters in message', () => {
      const specialMessage = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const params = createSubmitMessageParams({ message: specialMessage });

      const result = topicService.submitMessage(params);

      expect(result.transaction.message).toBe(specialMessage);
    });

    it('should handle unicode characters in message', () => {
      const unicodeMessage = 'Hello 世界 🌍';
      const params = createSubmitMessageParams({ message: unicodeMessage });

      const result = topicService.submitMessage(params);

      expect(result.transaction.message).toBe(unicodeMessage);
    });
  });
});
