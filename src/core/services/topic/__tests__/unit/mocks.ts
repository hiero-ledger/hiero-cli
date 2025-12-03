/**
 * Topic Service Test Mocks
 * SDK mocks and test data factories for topic transaction service tests
 */
import type { CreateTopicParams, SubmitMessageParams } from '../../types';

/**
 * Valid test keys for testing key operations
 */
export const VALID_PRIVATE_KEY_DER =
  '302e020100300506032b657004220420db484b828e64b2d8f12ce3c0a0e93a0b8cce7af1bb8f39c97732394482538e10';
export const VALID_PUBLIC_KEY =
  '302a300506032b65700321001234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
export const INVALID_KEY = 'not-a-valid-key';

/**
 * Create mock TopicCreateTransaction with fluent API
 */
export const createMockTopicCreateTransaction = () => ({
  setTopicMemo: jest.fn().mockReturnThis(),
  setAdminKey: jest.fn().mockReturnThis(),
  setSubmitKey: jest.fn().mockReturnThis(),
});

/**
 * Create mock TopicMessageSubmitTransaction
 * Constructor-based, stores params for verification
 */
export const createMockTopicMessageSubmitTransaction = (params?: {
  topicId?: string;
  message?: string;
}) => ({
  topicId: params?.topicId,
  message: params?.message,
});

/**
 * Create mock PrivateKey object
 */
export const createMockPrivateKey = (publicKeyValue = 'mock-public-key') => ({
  publicKey: {
    toStringRaw: jest.fn().mockReturnValue(publicKeyValue),
  },
});

/**
 * Create mock PublicKey object
 */
export const createMockPublicKey = (publicKeyValue = 'mock-public-key') => ({
  toStringRaw: jest.fn().mockReturnValue(publicKeyValue),
});

/**
 * Factory for CreateTopicParams test data
 */
export const createCreateTopicParams = (
  overrides: Partial<CreateTopicParams> = {},
): CreateTopicParams => ({
  ...overrides,
});

/**
 * Factory for SubmitMessageParams test data
 */
export const createSubmitMessageParams = (
  overrides: Partial<SubmitMessageParams> = {},
): SubmitMessageParams => ({
  topicId: '0.0.1001',
  message: 'Test message',
  ...overrides,
});
