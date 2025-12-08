/**
 * Unit tests for TopicServiceImpl
 * Tests topic creation, message submission, and key handling
 */
import { TopicServiceImpl } from '../../topic-transaction-service';
import {
  createMockTopicCreateTransaction,
  createMockTopicMessageSubmitTransaction,
  createMockPrivateKey,
  createMockPublicKey,
  createCreateTopicParams,
  createSubmitMessageParams,
  INVALID_KEY,
} from './mocks';
import {
  ECDSA_DER_PRIVATE_KEY,
  ECDSA_DER_PUBLIC_KEY,
} from '../../../../../__tests__/mocks/fixtures';

const mockTopicCreateTx = createMockTopicCreateTransaction();
const mockPrivateKey = createMockPrivateKey();
const mockPublicKey = createMockPublicKey();

jest.mock('@hashgraph/sdk', () => ({
  TopicCreateTransaction: jest.fn(() => mockTopicCreateTx),
  TopicMessageSubmitTransaction: jest.fn((params) =>
    createMockTopicMessageSubmitTransaction(params),
  ),
  PrivateKey: {
    fromStringDer: jest.fn(() => mockPrivateKey),
  },
  PublicKey: {
    fromString: jest.fn(() => mockPublicKey),
  },
}));

describe('TopicServiceImpl', () => {
  let topicService: TopicServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    topicService = new TopicServiceImpl();
  });

  describe('isPrivateKey', () => {
    it('should return true for valid DER-formatted private key', () => {
      const result = topicService.isPrivateKey(ECDSA_DER_PRIVATE_KEY);

      const { PrivateKey } = jest.requireMock('@hashgraph/sdk');
      expect(PrivateKey.fromStringDer).toHaveBeenCalledWith(
        ECDSA_DER_PRIVATE_KEY,
      );
      expect(result).toBe(true);
    });

    it('should return false for valid public key string', () => {
      const { PrivateKey } = jest.requireMock('@hashgraph/sdk');
      PrivateKey.fromStringDer.mockImplementationOnce(() => {
        throw new Error('Not a private key');
      });

      const result = topicService.isPrivateKey(ECDSA_DER_PUBLIC_KEY);

      expect(result).toBe(false);
    });

    it('should return false for invalid key format', () => {
      const { PrivateKey } = jest.requireMock('@hashgraph/sdk');
      PrivateKey.fromStringDer.mockImplementationOnce(() => {
        throw new Error('Invalid format');
      });

      const result = topicService.isPrivateKey(INVALID_KEY);

      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const { PrivateKey } = jest.requireMock('@hashgraph/sdk');
      PrivateKey.fromStringDer.mockImplementationOnce(() => {
        throw new Error('Empty key');
      });

      const result = topicService.isPrivateKey('');

      expect(result).toBe(false);
    });
  });

  describe('createKeyFromString', () => {
    it('should create PrivateKey when key is private key string', () => {
      const result = topicService.createKeyFromString(ECDSA_DER_PRIVATE_KEY);

      const { PrivateKey } = jest.requireMock('@hashgraph/sdk');
      expect(PrivateKey.fromStringDer).toHaveBeenCalledWith(
        ECDSA_DER_PRIVATE_KEY,
      );
      expect(result).toBe(mockPrivateKey);
    });

    it('should create PublicKey when key is public key string', () => {
      const { PrivateKey, PublicKey } = jest.requireMock('@hashgraph/sdk');
      PrivateKey.fromStringDer.mockImplementationOnce(() => {
        throw new Error('Not a private key');
      });

      const result = topicService.createKeyFromString(ECDSA_DER_PUBLIC_KEY);

      expect(PublicKey.fromString).toHaveBeenCalledWith(ECDSA_DER_PUBLIC_KEY);
      expect(result).toBe(mockPublicKey);
    });

    it('should delegate to isPrivateKey for key type detection', () => {
      const isPrivateKeySpy = jest.spyOn(topicService, 'isPrivateKey');

      topicService.createKeyFromString(ECDSA_DER_PRIVATE_KEY);

      expect(isPrivateKeySpy).toHaveBeenCalledWith(ECDSA_DER_PRIVATE_KEY);
    });

    it('should throw when PrivateKey.fromStringDer fails on second call', () => {
      const { PrivateKey } = jest.requireMock('@hashgraph/sdk');
      // First call in isPrivateKey() - uses default mock (succeeds)
      // Second call in createKeyFromString() - override to fail
      PrivateKey.fromStringDer
        .mockReturnValueOnce(mockPrivateKey)
        .mockImplementationOnce(() => {
          throw new Error('Invalid DER format');
        });

      expect(() =>
        topicService.createKeyFromString(ECDSA_DER_PRIVATE_KEY),
      ).toThrow('Invalid DER format');
    });

    it('should throw when PublicKey.fromString fails', () => {
      const { PrivateKey, PublicKey } = jest.requireMock('@hashgraph/sdk');
      PrivateKey.fromStringDer.mockImplementationOnce(() => {
        throw new Error('Not private');
      });
      PublicKey.fromString.mockImplementationOnce(() => {
        throw new Error('Invalid public key');
      });

      expect(() => topicService.createKeyFromString(INVALID_KEY)).toThrow(
        'Invalid public key',
      );
    });
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

    it('should create topic with admin key (private)', () => {
      const params = createCreateTopicParams({
        adminKey: ECDSA_DER_PRIVATE_KEY,
      });

      const result = topicService.createTopic(params);

      const { PrivateKey } = jest.requireMock('@hashgraph/sdk');
      expect(PrivateKey.fromStringDer).toHaveBeenCalledWith(
        ECDSA_DER_PRIVATE_KEY,
      );
      expect(mockTopicCreateTx.setAdminKey).toHaveBeenCalledWith(
        mockPrivateKey,
      );
      expect(mockTopicCreateTx.setSubmitKey).not.toHaveBeenCalled();
      expect(result.transaction).toBe(mockTopicCreateTx);
    });

    it('should create topic with admin key (public)', () => {
      const { PrivateKey, PublicKey } = jest.requireMock('@hashgraph/sdk');
      PrivateKey.fromStringDer.mockImplementationOnce(() => {
        throw new Error('Not private');
      });
      const params = createCreateTopicParams({
        adminKey: ECDSA_DER_PUBLIC_KEY,
      });

      const result = topicService.createTopic(params);

      expect(PublicKey.fromString).toHaveBeenCalledWith(ECDSA_DER_PUBLIC_KEY);
      expect(mockTopicCreateTx.setAdminKey).toHaveBeenCalledWith(mockPublicKey);
      expect(result.transaction).toBe(mockTopicCreateTx);
    });

    it('should create topic with submit key (private)', () => {
      const params = createCreateTopicParams({
        submitKey: ECDSA_DER_PRIVATE_KEY,
      });

      const result = topicService.createTopic(params);

      const { PrivateKey } = jest.requireMock('@hashgraph/sdk');
      expect(PrivateKey.fromStringDer).toHaveBeenCalledWith(
        ECDSA_DER_PRIVATE_KEY,
      );
      expect(mockTopicCreateTx.setSubmitKey).toHaveBeenCalledWith(
        mockPrivateKey,
      );
      expect(mockTopicCreateTx.setAdminKey).not.toHaveBeenCalled();
      expect(result.transaction).toBe(mockTopicCreateTx);
    });

    it('should create topic with both admin and submit keys', () => {
      const params = createCreateTopicParams({
        adminKey: ECDSA_DER_PRIVATE_KEY,
        submitKey: ECDSA_DER_PRIVATE_KEY,
      });

      const result = topicService.createTopic(params);

      const { PrivateKey } = jest.requireMock('@hashgraph/sdk');
      expect(PrivateKey.fromStringDer).toHaveBeenCalledTimes(4);
      expect(mockTopicCreateTx.setAdminKey).toHaveBeenCalledWith(
        mockPrivateKey,
      );
      expect(mockTopicCreateTx.setSubmitKey).toHaveBeenCalledWith(
        mockPrivateKey,
      );
      expect(result.transaction).toBe(mockTopicCreateTx);
    });

    it('should create topic with all optional parameters', () => {
      const params = createCreateTopicParams({
        memo: 'Full Topic',
        adminKey: ECDSA_DER_PRIVATE_KEY,
        submitKey: ECDSA_DER_PRIVATE_KEY,
      });

      const result = topicService.createTopic(params);

      expect(mockTopicCreateTx.setTopicMemo).toHaveBeenCalledWith('Full Topic');
      expect(mockTopicCreateTx.setAdminKey).toHaveBeenCalledWith(
        mockPrivateKey,
      );
      expect(mockTopicCreateTx.setSubmitKey).toHaveBeenCalledWith(
        mockPrivateKey,
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

    it('should throw when adminKey is invalid', () => {
      const { PrivateKey, PublicKey } = jest.requireMock('@hashgraph/sdk');
      // isPrivateKey call - fails
      PrivateKey.fromStringDer.mockImplementationOnce(() => {
        throw new Error('Not a valid key');
      });
      // createKeyFromString tries PublicKey - also fails
      PublicKey.fromString.mockImplementationOnce(() => {
        throw new Error('Invalid DER format');
      });
      const params = createCreateTopicParams({ adminKey: INVALID_KEY });

      expect(() => topicService.createTopic(params)).toThrow(
        'Invalid DER format',
      );
    });

    it('should throw when submitKey is invalid', () => {
      const { PrivateKey, PublicKey } = jest.requireMock('@hashgraph/sdk');
      // isPrivateKey call - fails
      PrivateKey.fromStringDer.mockImplementationOnce(() => {
        throw new Error('Not a valid key');
      });
      // createKeyFromString tries PublicKey - also fails
      PublicKey.fromString.mockImplementationOnce(() => {
        throw new Error('Invalid DER format');
      });
      const params = createCreateTopicParams({ submitKey: INVALID_KEY });

      expect(() => topicService.createTopic(params)).toThrow(
        'Invalid DER format',
      );
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
