/**
 * Hedera SDK Mocks for TX Execution Service Tests
 * Factory functions that create fresh mock instances for each test
 */

export const createMockTransaction = (overrides = {}) => ({
  isFrozen: jest.fn().mockReturnValue(false),
  freezeWith: jest.fn().mockReturnThis(),
  signWith: jest.fn().mockResolvedValue(undefined),
  execute: jest.fn(),
  ...overrides,
});

export const createMockTransactionResponse = (overrides = {}) => ({
  transactionId: {
    toString: jest.fn().mockReturnValue('0.0.1234@1234567890.000'),
  },
  getReceipt: jest.fn(),
  getRecord: jest.fn(),
  ...overrides,
});

export const createMockTransactionReceipt = (overrides = {}) => ({
  status: null,
  accountId: null,
  tokenId: null,
  topicId: null,
  topicSequenceNumber: null,
  ...overrides,
});

export const createMockTransactionRecord = (overrides = {}) => ({
  consensusTimestamp: {
    toDate: jest.fn().mockReturnValue(new Date('2024-01-01T00:00:00.000Z')),
  },
  ...overrides,
});

export const createMockClient = () => ({
  close: jest.fn(),
});
