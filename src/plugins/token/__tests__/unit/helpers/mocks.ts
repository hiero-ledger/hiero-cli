/**
 * Shared Mock Factory Functions for Token Plugin Tests
 * Provides reusable mocks for services, APIs, and common test utilities
 */
import type { Logger } from '../../../../../core/services/logger/logger-service.interface';
import type { CoreApi } from '../../../../../core/core-api/core-api.interface';
import type { TokenService } from '../../../../../core/services/token/token-service.interface';
import type { TxExecutionService } from '../../../../../core/services/tx-execution/tx-execution-service.interface';
import type { StateService } from '../../../../../core/services/state/state-service.interface';
import type { KmsService } from '../../../../../core/services/kms/kms-service.interface';
import type { AliasService } from '../../../../../core/services/alias/alias-service.interface';
import type { AccountService } from '../../../../../core/services/account/account-transaction-service.interface';
import type { NetworkService } from '../../../../../core/services/network/network-service.interface';
import type { ConfigService } from '../../../../../core/services/config/config-service.interface';
import type { HbarService } from '../../../../../core/services/hbar/hbar-service.interface';
import type { OutputService } from '../../../../../core/services/output/output-service.interface';
import type { PluginManagementService } from '../../../../../core/services/plugin-management/plugin-management-service.interface';
import { mockTransactionResults } from './fixtures';

/**
 * Create a mocked Logger
 */
export const makeLogger = (): jest.Mocked<Logger> => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  setLevel: jest.fn(),
});

/**
 * Create a mocked TokenService
 */
export const makeTokenServiceMock = (
  overrides?: Partial<jest.Mocked<TokenService>>,
): jest.Mocked<TokenService> => ({
  createTokenTransaction: jest.fn(),
  createTokenAssociationTransaction: jest.fn(),
  createTransferTransaction: jest.fn(),
  ...overrides,
});

/**
 * @deprecated Use makeTokenServiceMock instead
 */
export const makeTokenTransactionServiceMock = makeTokenServiceMock;

/**
 * Create a mocked TxExecutionService
 */
export const makeTxExecutionServiceMock = (
  overrides?: Partial<jest.Mocked<TxExecutionService>>,
): jest.Mocked<TxExecutionService> => ({
  signAndExecute: jest.fn().mockResolvedValue(mockTransactionResults.success),
  signAndExecuteWith: jest
    .fn()
    .mockResolvedValue(mockTransactionResults.success),
  ...overrides,
});

/**
 * Create a mocked KeyManagementService (CredentialsState)
 */
export const makeKmsMock = (
  overrides?: Partial<jest.Mocked<KmsService>>,
): jest.Mocked<KmsService> => ({
  createLocalPrivateKey: jest.fn(),
  importPrivateKey: jest.fn().mockReturnValue({
    keyRefId: 'mock-key-ref-id',
    publicKey: 'mock-public-key',
  }),
  getPublicKey: jest.fn().mockReturnValue('mock-public-key'),
  getSignerHandle: jest.fn(),
  findByPublicKey: jest.fn().mockImplementation((publicKey) => {
    // Return a keyRefId for any public key by default
    // Tests can override this behavior as needed
    if (publicKey === 'operator-public-key') {
      return 'operator-key-ref-id';
    }
    if (publicKey === 'admin-key') {
      return 'admin-key-ref-id';
    }
    if (publicKey === 'test-admin-key') {
      return 'admin-key-ref-id';
    }
    if (publicKey === 'test-public-key') {
      return 'test-key-ref-id';
    }
    if (publicKey === 'treasury-public-key') {
      return 'treasury-key-ref-id';
    }
    return undefined;
  }),
  list: jest.fn().mockReturnValue([]),
  remove: jest.fn(),

  createClient: jest.fn(),
  signTransaction: jest.fn(),
  ...overrides,
});

/**
 * Create a mocked AliasService
 */
export const makeAliasServiceMock = (
  overrides?: Partial<jest.Mocked<AliasService>>,
): jest.Mocked<AliasService> => ({
  register: jest.fn(),
  resolve: jest.fn().mockReturnValue(null),
  list: jest.fn().mockReturnValue([]),
  remove: jest.fn(),
  availableOrThrow: jest.fn(),
  exists: jest.fn(),
  ...overrides,
});

/**
 * Create a mocked StateService
 */
export const makeStateServiceMock = (
  overrides?: Partial<jest.Mocked<StateService>>,
): jest.Mocked<StateService> => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  list: jest.fn(),
  clear: jest.fn(),
  has: jest.fn(),
  getNamespaces: jest.fn(),
  getKeys: jest.fn(),
  subscribe: jest.fn(),
  getActions: jest.fn(),
  getState: jest.fn(),
  registerNamespaces: jest.fn(),
  getStorageDirectory: jest.fn().mockReturnValue('/mock/storage/dir'),
  isInitialized: jest.fn().mockReturnValue(true),
  ...overrides,
});

/**
 * Create a mocked AccountTransactionService
 */
export const makeAccountTransactionServiceMock =
  (): jest.Mocked<AccountService> =>
    ({
      createAccount: jest.fn(),
      getAccountInfo: jest.fn(),
      getAccountBalance: jest.fn(),
    }) as jest.Mocked<AccountService>;

/**
 * Configuration options for makeApiMocks
 */
interface ApiMocksConfig {
  tokens?: Partial<jest.Mocked<TokenService>>;
  tokenTransactions?: Partial<jest.Mocked<TokenService>>; // Deprecated, use 'tokens'
  signing?: Partial<jest.Mocked<TxExecutionService>>;
  kms?: Partial<jest.Mocked<KmsService>>;
  alias?: Partial<jest.Mocked<AliasService>>;
  state?: Partial<jest.Mocked<StateService>>;
  mirror?: Record<string, jest.Mock>;
  network?: string;
  createTransferImpl?: jest.Mock;
  signAndExecuteImpl?: jest.Mock;
}

/**
 * Create a complete mocked CoreApi with configurable services
 */
export const makeApiMocks = (config?: ApiMocksConfig) => {
  // Support both 'tokens' and 'tokenTransactions' for backward compatibility
  const tokens = makeTokenServiceMock(
    config?.tokens || config?.tokenTransactions,
  );
  const signing = makeTxExecutionServiceMock(config?.signing);
  const kms = makeKmsMock(config?.kms);
  const alias = makeAliasServiceMock(config?.alias);
  const state = makeStateServiceMock(config?.state);
  const account = makeAccountTransactionServiceMock();

  const api: jest.Mocked<CoreApi> = {
    account,
    token: tokens,
    topic: {} as unknown as any,
    txExecution: signing,
    kms,
    alias,
    state,
    mirror: {
      getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
      ...(config?.mirror || {}),
    } as unknown as any,
    network: {
      getCurrentNetwork: jest
        .fn()
        .mockReturnValue(config?.network || 'testnet'),
      getOperator: jest.fn().mockReturnValue({
        accountId: '0.0.100000',
        keyRefId: 'operator-key-ref-id',
      }),
      setOperator: jest.fn(),
    } as unknown as NetworkService,
    config: {
      getOption: jest.fn().mockReturnValue('local'),
      setOption: jest.fn(),
      listOptions: jest.fn().mockReturnValue([]),
    } as unknown as ConfigService,
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      setLevel: jest.fn(),
    } as jest.Mocked<Logger>,
    hbar: {
      transferTinybar: jest.fn(),
    } as jest.Mocked<HbarService>,
    output: {
      handleCommandOutput: jest.fn(),
      getFormat: jest.fn().mockReturnValue('human'),
    } as jest.Mocked<OutputService>,
    pluginManagement: {
      listPlugins: jest.fn().mockReturnValue([]),
      getPlugin: jest.fn(),
      addPlugin: jest.fn(),
      removePlugin: jest.fn(),
      enablePlugin: jest.fn(),
      disablePlugin: jest.fn(),
      savePluginState: jest.fn(),
    } as PluginManagementService,
  };

  return {
    api,
    tokens,
    tokenTransactions: tokens, // Deprecated alias for backward compatibility
    signing,
    kms,
    alias,
    state,
    account,
    createTransferImpl: config?.createTransferImpl, // Legacy support
  };
};

/**
 * Setup and cleanup for process.exit spy
 */
export const mockProcessExit = () => {
  let exitSpy: jest.SpyInstance;

  const setupExit = () => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      // Return undefined as never to satisfy TypeScript
      // Tests will verify process.exit was called with the correct code
      return undefined as never;
    });
  };

  const cleanupExit = () => {
    if (exitSpy) {
      exitSpy.mockRestore();
    }
  };

  const getExitSpy = () => exitSpy;

  return { setupExit, cleanupExit, getExitSpy };
};

/**
 * Create a custom transaction result
 */
export const makeTransactionResult = (
  overrides?: Partial<{
    success: boolean;
    transactionId: string;
    tokenId?: string;
    accountId?: string;
  }>,
) => ({
  success: overrides?.success ?? true,
  transactionId: overrides?.transactionId ?? '0.0.123@1234567890.123456789',
  tokenId: overrides?.tokenId,
  accountId: overrides?.accountId,
  receipt: {
    status: {
      status: (overrides?.success ?? true) ? 'success' : 'failed',
      transactionId: overrides?.transactionId ?? '0.0.123@1234567890.123456789',
    },
  },
});

/**
 * Setup and cleanup for process.exit spy that throws
 * Use this variant for tests that expect process.exit to throw an error
 */
export const mockProcessExitThrows = () => {
  let exitSpy: jest.SpyInstance;

  const setupExit = () => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process.exit(${code})`);
    });
  };

  const cleanupExit = () => {
    if (exitSpy) {
      exitSpy.mockRestore();
    }
  };

  const getExitSpy = () => exitSpy;

  return { setupExit, cleanupExit, getExitSpy };
};

/**
 * Mock ZustandTokenStateHelper
 * Provides a mocked implementation of the token state helper
 */
export const mockZustandTokenStateHelper = (
  ZustandTokenStateHelperClass: any,
  overrides?: Partial<{
    saveToken: jest.Mock;
    addToken: jest.Mock;
    addAssociation: jest.Mock;
    getToken: jest.Mock;
    getAllTokens: jest.Mock;
    removeToken: jest.Mock;
    addTokenAssociation: jest.Mock;
  }>,
) => {
  ZustandTokenStateHelperClass.mockClear();
  ZustandTokenStateHelperClass.mockImplementation(() => ({
    saveToken: jest.fn().mockResolvedValue(undefined),
    addToken: jest.fn(),
    addAssociation: jest.fn(),
    getToken: jest.fn(),
    getAllTokens: jest.fn(),
    removeToken: jest.fn(),
    addTokenAssociation: jest.fn(),
    ...overrides,
  }));
  return ZustandTokenStateHelperClass;
};

/**
 * Create mocks for file system operations (fs/promises and path)
 * Used primarily for file-based token creation tests
 */
export const makeFsMocks = () => {
  const mockReadFile = jest.fn();
  const mockAccess = jest.fn();
  const mockJoin = jest.fn();
  const mockResolve = jest.fn();

  const setupFsMocks = (
    fs: any,
    path: any,
    config?: {
      fileContent?: string;
      fileExists?: boolean;
      joinPath?: string;
      resolvePath?: string;
    },
  ) => {
    fs.readFile = mockReadFile;
    fs.access = mockAccess;
    path.join = mockJoin;
    path.resolve = mockResolve;

    if (config?.fileContent !== undefined) {
      mockReadFile.mockResolvedValue(config.fileContent);
    }
    if (config?.fileExists !== undefined) {
      mockAccess.mockResolvedValue(
        config.fileExists
          ? undefined
          : Promise.reject(new Error('File not found')),
      );
    }
    if (config?.joinPath) {
      mockJoin.mockReturnValue(config.joinPath);
    }
    if (config?.resolvePath) {
      mockResolve.mockReturnValue(config.resolvePath);
    }
  };

  const cleanupFsMocks = () => {
    mockReadFile.mockClear();
    mockAccess.mockClear();
    mockJoin.mockClear();
    mockResolve.mockClear();
  };

  return {
    mockReadFile,
    mockAccess,
    mockJoin,
    mockResolve,
    setupFsMocks,
    cleanupFsMocks,
  };
};

/**
 * Setup mock implementation for ZustandTokenStateHelper for list tests
 * Simplifies the repetitive mock setup across list test cases
 */
export const setupZustandHelperMock = (
  MockedHelperClass: jest.Mock,
  config: {
    tokens?: any[];
    stats?: {
      total: number;
      byNetwork: Record<string, number>;
      bySupplyType: Record<string, number>;
      withAssociations: number;
      totalAssociations: number;
    };
  },
) => {
  MockedHelperClass.mockImplementation(() => ({
    listTokens: jest.fn().mockReturnValue(config.tokens || []),
    getTokensWithStats: jest.fn().mockReturnValue(
      config.stats || {
        total: 0,
        byNetwork: {},
        bySupplyType: {},
        withAssociations: 0,
        totalAssociations: 0,
      },
    ),
  }));
};
