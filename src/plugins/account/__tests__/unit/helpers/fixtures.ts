/**
 * Test Fixtures for Account Plugin Tests
 * Reusable test data and constants
 */
import type { AliasRecord } from '@/core/services/alias/alias-service.interface';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import type { AccountData } from '@/plugins/account/schema';

/**
 * Mock Account IDs
 */
export const mockAccountIds = {
  default: '0.0.1234',
  testAccount: '0.0.1001',
  account2: '0.0.2002',
  account3: '0.0.5005',
  account4: '0.0.6006',
};

/**
 * Mock Account Data
 */
export const mockAccountData = {
  default: {
    keyRefId: 'kr_test123',
    name: 'default',
    accountId: mockAccountIds.default,
    type: KeyAlgorithm.ECDSA,
    publicKey: 'pk',
    evmAddress: '0x0000000000000000000000000000000000000000',
    network: 'testnet',
  } satisfies AccountData,
  testAccount: {
    keyRefId: 'kr_test456',
    name: 'test-account',
    accountId: mockAccountIds.testAccount,
    type: KeyAlgorithm.ECDSA,
    publicKey: 'pk',
    evmAddress: '0x0000000000000000000000000000000000000000',
    network: 'testnet',
  } satisfies AccountData,
  ed25519Account: {
    keyRefId: 'kr_test789',
    name: 'acc3',
    accountId: mockAccountIds.account3,
    type: KeyAlgorithm.ED25519,
    publicKey: 'pk',
    evmAddress: '0x0000000000000000000000000000000000000000',
    network: 'testnet',
  } satisfies AccountData,
};

/**
 * Mock Token Balances
 */
export const mockTokenBalances = {
  empty: [],
  twoTokens: [
    { token_id: '0.0.3003', balance: 100 },
    { token_id: '0.0.4004', balance: 200 },
  ],
};

/**
 * Mock Transaction Results
 */
export const mockTransactionResults = {
  success: {
    transactionId: 'tx-123',
    success: true,
    accountId: '0.0.9999',
    receipt: {} as any,
  },
  failure: {
    transactionId: 'tx-456',
    success: false,
    receipt: {} as any,
  },
};

/**
 * Mock Account Creation Responses
 */
export const mockAccountCreationData = {
  default: {
    transaction: {},
    privateKey: 'priv-key',
    publicKey: 'pub-key',
    evmAddress: '0x000000000000000000000000000000000000abcd',
  },
};

/**
 * Mock Mirror Node Account Responses
 */
export const mockMirrorAccountData = {
  default: {
    accountId: '0.0.1234',
    accountPublicKey: 'pubKey',
    evmAddress: '0xabc',
    balance: { balance: 1000n, timestamp: '1234567890' },
  },
  withBalance: {
    accountPublicKey: 'pubKey',
    evmAddress: '0xabc',
    balance: { balance: 100n },
  },
};

/**
 * Mock Account Lists
 */
export const mockAccountLists = {
  empty: [],
  twoAccounts: [
    { ...mockAccountData.default, name: 'acc1', accountId: '0.0.1111' },
    { ...mockAccountData.default, name: 'acc2', accountId: '0.0.2222' },
  ],
};

/**
 * Mock Alias Records
 * Example alias records for testing alias management
 */
export const mockAliasRecords = {
  accountTestnet: {
    alias: 'acc-alias-testnet',
    type: AliasType.Account,
    network: 'testnet' as const,
    entityId: '0.0.7777',
    createdAt: '2024-01-01T00:00:00.000Z',
  } satisfies AliasRecord,
  accountMainnet: {
    alias: 'acc-alias-mainnet',
    type: AliasType.Account,
    network: 'mainnet' as const,
    entityId: '0.0.7777',
    createdAt: '2024-01-01T00:00:00.000Z',
  } satisfies AliasRecord,
  tokenTestnet: {
    alias: 'token-alias-testnet',
    type: AliasType.Token,
    network: 'testnet' as const,
    entityId: '0.0.7777',
    createdAt: '2024-01-01T00:00:00.000Z',
  } satisfies AliasRecord,
  otherAccountTestnet: {
    alias: 'other-acc-testnet',
    type: AliasType.Account,
    network: 'testnet' as const,
    entityId: '0.0.8888',
    createdAt: '2024-01-01T00:00:00.000Z',
  } satisfies AliasRecord,
};

/**
 * Mock Alias Record Lists
 * Collections of alias records for different test scenarios
 */
export const mockAliasLists = {
  empty: [],
  multiNetworkMultiType: [
    mockAliasRecords.accountTestnet,
    mockAliasRecords.accountMainnet,
    mockAliasRecords.tokenTestnet,
    mockAliasRecords.otherAccountTestnet,
  ],
};

/**
 * Balance constants for testing (in Tinybars)
 * These represent realistic Hbar amounts:
 * - OPERATOR_SUFFICIENT_BALANCE: 100000 Hbar (100000 * 10^8 tinybars)
 * - ACCOUNT_REQUEST_BALANCE: 10 Hbar (typical account creation)
 */
export const OPERATOR_SUFFICIENT_BALANCE = 10_000_000_000_000n; // 100000 Hbar in tinybars
export const OPERATOR_ACCOUNT_ID = '0.0.123';
export const OPERATOR_KEY_REF_ID = 'kr_operator_test';
