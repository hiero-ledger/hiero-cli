import { Transaction } from '@hashgraph/sdk';

export const createMockTransaction = (overrides = {}) => {
  const mock = {
    isFrozen: jest.fn().mockReturnValue(false),
    freezeWith: jest.fn().mockReturnThis(),
    setTransactionId: jest.fn().mockReturnThis(),
    signWith: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn(),
    toBytes: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
    transactionId: {
      toString: jest.fn().mockReturnValue('0.0.1234@1234567890.000'),
    },
    ...overrides,
  };
  Object.setPrototypeOf(mock, Transaction.prototype);
  return mock;
};

export const createMockContractCreateFlow = (overrides = {}) => ({
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
  contractId: null,
  serials: null,
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
