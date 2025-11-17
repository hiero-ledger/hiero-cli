/**
 * Shared Mock Factory Functions for State Management Plugin Tests
 * Provides reusable mocks for services, APIs, and common test utilities
 */
import type { CommandHandlerArgs } from '../../../../../core/plugins/plugin.interface';
import type { Logger } from '../../../../../core/services/logger/logger-service.interface';
import type { CoreApi } from '../../../../../core/core-api/core-api.interface';
import type { StateService } from '../../../../../core/services/state/state-service.interface';
import { mockStateData } from './fixtures';

/**
 * Create a mocked Logger
 */
export const makeLogger = (): jest.Mocked<Logger> => ({
  log: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  warn: jest.fn(),
});

/**
 * Creates mock StateService
 */
export const makeStateServiceMock = (
  overrides?: Partial<jest.Mocked<StateService>>,
): jest.Mocked<StateService> => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  list: jest.fn().mockReturnValue([]),
  clear: jest.fn(),
  getKeys: jest.fn().mockReturnValue([]),
  getNamespaces: jest.fn().mockReturnValue([]),
  has: jest.fn().mockReturnValue(false),
  subscribe: jest.fn().mockReturnValue(() => {}),
  getActions: jest.fn().mockReturnValue({}),
  getState: jest.fn().mockReturnValue({}),
  registerNamespaces: jest.fn(),
  getStorageDirectory: jest.fn().mockReturnValue('/mock/storage/dir'),
  isInitialized: jest.fn().mockReturnValue(true),
  ...overrides,
});

/**
 * Creates mock StateService with specific namespace data
 */
export const makeStateServiceWithData = (
  namespaceData: Record<string, unknown[]> = mockStateData,
): jest.Mocked<StateService> => {
  const namespaces = Object.keys(namespaceData);

  return {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    list: jest.fn().mockImplementation((namespace: string) => {
      return namespaceData[namespace] || [];
    }),
    clear: jest.fn(),
    getKeys: jest.fn().mockImplementation((namespace: string) => {
      const data = namespaceData[namespace] || [];
      return data.map((_, index) => `key-${index}`);
    }),
    getNamespaces: jest.fn().mockReturnValue(namespaces),
    has: jest.fn().mockReturnValue(true),
    subscribe: jest.fn().mockReturnValue(() => {}),
    getActions: jest.fn().mockReturnValue({}),
    getState: jest.fn().mockReturnValue({}),
    registerNamespaces: jest.fn(),
    getStorageDirectory: jest.fn().mockReturnValue('/mock/storage/dir'),
    isInitialized: jest.fn().mockReturnValue(true),
  };
};

/**
 * Creates mock StateService with empty data
 */
export const makeEmptyStateServiceMock = (): jest.Mocked<StateService> => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  list: jest.fn().mockReturnValue([]),
  clear: jest.fn(),
  getKeys: jest.fn().mockReturnValue([]),
  getNamespaces: jest.fn().mockReturnValue([]),
  has: jest.fn().mockReturnValue(false),
  subscribe: jest.fn().mockReturnValue(() => {}),
  getActions: jest.fn().mockReturnValue({}),
  getState: jest.fn().mockReturnValue({}),
  registerNamespaces: jest.fn(),
  getStorageDirectory: jest.fn().mockReturnValue('/mock/storage/dir'),
  isInitialized: jest.fn().mockReturnValue(true),
});

/**
 * Creates mock CoreApi with StateService
 */
export const makeCoreApiMock = (
  stateService?: jest.Mocked<StateService>,
): jest.Mocked<CoreApi> => ({
  state: stateService || makeStateServiceMock(),
  network: {} as any,
  account: {} as any,
  token: {} as any,
  topic: {} as any,
  alias: {} as any,
  txExecution: {} as any,
  logger: {} as any,
  config: {} as any,
  mirror: {} as any,
  kms: {} as any,
  hbar: {} as any,
  output: {} as any,
});

/**
 * Creates CommandHandlerArgs for testing command handlers
 */
export const makeArgs = (
  api: Partial<CoreApi>,
  logger: jest.Mocked<Logger>,
  args: Record<string, unknown>,
): CommandHandlerArgs => ({
  api: api as CoreApi,
  logger,
  state: {} as any,
  config: {} as any,
  args,
});

/**
 * Creates mock file system operations
 */
export const makeFileSystemMocks = () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  statSync: jest.fn(),
});

/**
 * Creates mock path operations
 */
export const makePathMocks = () => ({
  join: jest.fn((...paths: string[]) => paths.join('/')),
  resolve: jest.fn((path: string) => `/resolved/${path}`),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path: string) => path.split('/').pop() || ''),
});

/**
 * Creates mock backup data factory
 */
export const makeBackupData = (overrides: Partial<any> = {}) => ({
  timestamp: '2024-01-01T00:00:00.000Z',
  namespaces: mockStateData,
  metadata: {
    totalNamespaces: 3,
    totalSize: 500,
  },
  ...overrides,
});

/**
 * Creates mock namespace info factory
 */
export const makeNamespaceInfo = (overrides: Partial<any> = {}) => ({
  name: 'test-namespace',
  entryCount: 5,
  size: 250,
  lastModified: '2024-01-01T00:00:00.000Z',
  ...overrides,
});
