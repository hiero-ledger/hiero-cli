/**
 * Topic Service Test Mocks
 * SDK mocks and test data factories for topic transaction service tests
 */
import type { CreateTopicParams, SubmitMessageParams } from '../../types';

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
