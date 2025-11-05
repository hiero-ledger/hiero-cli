/**
 * Test Fixtures for HBAR Transfer Tests
 * Reusable test data and constants
 */
import { makeAccountData } from '../../../../../../__tests__/helpers/plugin';
import type { AccountData } from '../../../../account/schema';

/**
 * Mock Account IDs
 */
export const mockAccountIds = {
  sender: '0.0.1001',
  receiver: '0.0.2002',
  default: '0.0.3000',
};

/**
 * Mock Private Keys
 * Format: account-id:private-key (for testing account-id:private-key pairs)
 */
export const mockPrivateKeys = {
  sender:
    '302e020100301006072a8648ce3d020106052b8104000a04220420abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  default:
    '302e020100301006072a8648ce3d020106052b8104000a04220420abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
};

/**
 * Mock Account ID with Private Key Strings
 * Format: account-id:private-key
 */
export const mockAccountIdKeyPairs = {
  sender: `${mockAccountIds.sender}:${mockPrivateKeys.sender}`,
  default: `${mockAccountIds.default}:${mockPrivateKeys.default}`,
};

/**
 * Common Test Accounts
 */
export const mockAccounts = {
  sender: makeAccountData({
    name: 'sender',
    accountId: mockAccountIds.sender,
    network: 'testnet',
  }),
  receiver: makeAccountData({
    name: 'receiver',
    accountId: mockAccountIds.receiver,
    network: 'testnet',
  }),
  sameAccount: makeAccountData({
    name: 'same-account',
    accountId: mockAccountIds.sender,
    network: 'testnet',
  }),
};

/**
 * Mock Transaction Results
 */
export const mockTransactionResults = {
  success: {
    success: true,
    transactionId: '0.0.1001@1234567890.123456789',
    receipt: {} as any,
  },
  successDefault: {
    success: true,
    transactionId: '0.0.3000@1234567890.987654321',
    receipt: {} as any,
  },
  successGeneric: {
    success: true,
    transactionId: 'test-tx',
    receipt: {} as any,
  },
  failure: {
    success: false,
    transactionId: '',
    receipt: {
      status: {
        status: 'failed',
        transactionId: '',
      },
    },
  },
};

/**
 * Mock Transfer Transaction Results
 */
export const mockTransferTransactionResults = {
  empty: {
    transaction: {},
  },
};

/**
 * Mock Default Credentials
 */
export const mockDefaultCredentials = {
  testnet: {
    accountId: mockAccountIds.default,
    privateKey: 'default-key',
    network: 'testnet' as const,
    isDefault: true,
  },
  mainnet: {
    accountId: mockAccountIds.default,
    privateKey: 'default-key',
    network: 'mainnet' as const,
    isDefault: true,
  },
};

/**
 * Mock Transfer Amounts (in tinybars)
 */
export const mockAmounts = {
  small: '100',
  medium: '50000000',
  large: '100000000',
  zero: '0',
  negative: '-100',
};

/**
 * Mock Account Lists
 */
export const mockAccountLists = {
  empty: [] as AccountData[],
  senderOnly: [mockAccounts.sender],
  receiverOnly: [mockAccounts.receiver],
  senderAndReceiver: [mockAccounts.sender, mockAccounts.receiver],
};

/**
 * Test Balance Values
 */
export const mockBalances = {
  valid: '100000000',
  small: '100',
  zero: '0',
  negative: '-100',
  invalid: NaN,
};

/**
 * Parsed Balance Values
 */
export const mockParsedBalances = {
  valid: 10000000000000000,
  medium: 5000000000000000,
  small: 10000000000,
};
