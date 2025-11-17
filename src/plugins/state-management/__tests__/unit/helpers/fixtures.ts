/**
 * Test Fixtures for State Management Plugin Tests
 * Reusable test data and constants
 */
import type { NamespaceInfo, StateEntry, BackupData } from '../../../schema';
import { KeyAlgorithm } from '../../../../../core/shared/constants';

/**
 * Mock Namespace Names
 */
export const mockNamespaces = {
  accounts: 'accounts',
  tokens: 'tokens',
  topics: 'topics',
  scripts: 'scripts',
  credentials: 'credentials',
};

/**
 * Mock State Entries
 */
export const mockStateEntries = {
  accountEntry: {
    key: 'account-1',
    value: {
      name: 'test-account',
      accountId: '0.0.1234',
      type: KeyAlgorithm.ECDSA,
      network: 'testnet',
    },
    namespace: mockNamespaces.accounts,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  } satisfies StateEntry,
  tokenEntry: {
    key: 'token-1',
    value: {
      name: 'TestToken',
      tokenId: '0.0.5678',
      symbol: 'TT',
      decimals: 2,
    },
    namespace: mockNamespaces.tokens,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  } satisfies StateEntry,
  topicEntry: {
    key: 'topic-1',
    value: {
      name: 'test-topic',
      topicId: '0.0.9999',
      memo: 'Test topic',
    },
    namespace: mockNamespaces.topics,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  } satisfies StateEntry,
};

/**
 * Mock Namespace Information
 */
export const mockNamespaceInfo = {
  accounts: {
    name: mockNamespaces.accounts,
    entryCount: 2,
    size: 150,
    lastModified: '2024-01-01T00:00:00.000Z',
  } satisfies NamespaceInfo,
  tokens: {
    name: mockNamespaces.tokens,
    entryCount: 1,
    size: 100,
    lastModified: '2024-01-01T00:00:00.000Z',
  } satisfies NamespaceInfo,
  topics: {
    name: mockNamespaces.topics,
    entryCount: 1,
    size: 80,
    lastModified: '2024-01-01T00:00:00.000Z',
  } satisfies NamespaceInfo,
  empty: {
    name: 'empty-namespace',
    entryCount: 0,
    size: 0,
    lastModified: '2024-01-01T00:00:00.000Z',
  } satisfies NamespaceInfo,
};

/**
 * Mock Namespace Lists
 */
export const mockNamespaceLists = {
  empty: [],
  singleNamespace: [mockNamespaceInfo.accounts],
  multipleNamespaces: [
    mockNamespaceInfo.accounts,
    mockNamespaceInfo.tokens,
    mockNamespaceInfo.topics,
  ],
  withEmptyNamespace: [mockNamespaceInfo.accounts, mockNamespaceInfo.empty],
};

/**
 * Mock State Data
 */
export const mockStateData = {
  accounts: [
    mockStateEntries.accountEntry.value,
    {
      name: 'account-2',
      accountId: '0.0.5678',
      type: KeyAlgorithm.ED25519,
      network: 'testnet',
    },
  ],
  tokens: [mockStateEntries.tokenEntry.value],
  topics: [mockStateEntries.topicEntry.value],
};

/**
 * Mock Backup Data
 */
export const mockBackupData = {
  default: {
    timestamp: '2024-01-01T00:00:00.000Z',
    namespaces: {
      [mockNamespaces.accounts]: mockStateData.accounts,
      [mockNamespaces.tokens]: mockStateData.tokens,
      [mockNamespaces.topics]: mockStateData.topics,
    },
    metadata: {
      totalNamespaces: 3,
      totalSize: 500,
    },
  } satisfies BackupData,
  empty: {
    timestamp: '2024-01-01T00:00:00.000Z',
    namespaces: {},
    metadata: {
      totalNamespaces: 0,
      totalSize: 0,
    },
  } satisfies BackupData,
};

/**
 * Mock File Paths
 */
export const mockFilePaths = {
  backupFile: '/tmp/hedera-cli-backup-2024-01-01T00-00-00-000Z.json',
  storageDirectory: '/home/user/.hedera-cli/state',
  nonExistentDirectory: '/tmp/non-existent',
};

/**
 * Mock Statistics
 */
export const mockStatistics = {
  empty: {
    totalNamespaces: 0,
    totalEntries: 0,
    totalSize: 0,
    namespaces: [],
  },
  withData: {
    totalNamespaces: 3,
    totalEntries: 4,
    totalSize: 330,
    namespaces: mockNamespaceLists.multipleNamespaces,
  },
};
