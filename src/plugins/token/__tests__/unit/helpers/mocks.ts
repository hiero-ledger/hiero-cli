/**
 * Shared Mock Factory Functions for Token Plugin Tests
 * Provides reusable mocks for services, APIs, and common test utilities
 */
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AccountService } from '@/core/services/account/account-transaction-service.interface';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { BatchTransactionService } from '@/core/services/batch/batch-transaction-service.interface';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { ContractCompilerService } from '@/core/services/contract-compiler/contract-compiler-service.interface';
import type { ContractQueryService } from '@/core/services/contract-query/contract-query-service.interface';
import type { ContractTransactionService } from '@/core/services/contract-transaction/contract-transaction-service.interface';
import type { ContractVerifierService } from '@/core/services/contract-verifier/contract-verifier-service.interface';
import type { HbarService } from '@/core/services/hbar/hbar-service.interface';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { OutputService } from '@/core/services/output/output-service.interface';
import type { OutputHandlerOptions } from '@/core/services/output/types';
import type { PluginManagementService } from '@/core/services/plugin-management/plugin-management-service.interface';
import type { ReceiptService } from '@/core/services/receipt/receipt-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type { TokenService } from '@/core/services/token/token-service.interface';
import type { TopicService } from '@/core/services/topic/topic-transaction-service.interface';
import type { TxExecuteService } from '@/core/services/tx-execute/tx-execute-service.interface';
import type { TxSignService } from '@/core/services/tx-sign/tx-sign-service.interface';

import { PublicKey } from '@hashgraph/sdk';

import { ED25519_HEX_PUBLIC_KEY } from '@/__tests__/mocks/fixtures';
import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import {
  makeIdentityResolutionServiceMock as makeGlobalIdentityResolutionServiceMock,
  makeKeyResolverMock as makeGlobalKeyResolverMock,
  makeScheduleTransactionServiceMock,
} from '@/__tests__/mocks/mocks';
import { InternalError, KeyAlgorithm } from '@/core';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { MirrorNodeKeyType } from '@/core/services/mirrornode/types';

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
  createMintTransaction: jest.fn(),
  createNftTransferTransaction: jest.fn(),
  createNftAllowanceApproveTransaction: jest.fn(),
  createNftAllowanceDeleteTransaction: jest.fn(),
  createFungibleTokenAllowanceTransaction: jest.fn(),
  createDeleteTransaction: jest.fn(),
  createAirdropFtTransaction: jest.fn(),
  createAirdropNftTransaction: jest.fn(),
  createCancelAirdropTransaction: jest.fn(),
  createClaimAirdropTransaction: jest.fn(),
  createBurnFtTransaction: jest.fn(),
  createBurnNftTransaction: jest.fn(),
  ...overrides,
});

/**
 * @deprecated Use makeTokenServiceMock instead
 */
export const makeTokenTransactionServiceMock = makeTokenServiceMock;

export const makeTxSignServiceMock = (
  overrides?: Partial<jest.Mocked<TxSignService>>,
): jest.Mocked<TxSignService> => ({
  sign: jest.fn().mockResolvedValue(createMockTransaction()),
  signContractCreateFlow: jest.fn().mockImplementation((flow) => flow),
  ...overrides,
});

export const makeTxExecuteServiceMock = (
  overrides?: Partial<jest.Mocked<TxExecuteService>>,
): jest.Mocked<TxExecuteService> => ({
  execute: jest.fn().mockResolvedValue(mockTransactionResults.success),
  executeContractCreateFlow: jest
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
  createLocalPrivateKey: jest.fn().mockReturnValue({
    keyRefId: 'mock-key-ref-id',
    publicKey: 'mock-public-key',
  }),
  importPublicKey: jest.fn().mockReturnValue({
    keyRefId: 'mock-key-ref-id',
    publicKey: 'mock-public-key',
  }),
  importPrivateKey: jest.fn().mockReturnValue({
    keyRefId: 'mock-key-ref-id',
    publicKey: 'mock-public-key',
  }),
  importAndValidatePrivateKey: jest.fn().mockReturnValue({
    keyRefId: 'mock-key-ref-id',
    publicKey: 'mock-public-key',
  }),
  getSignerHandle: jest.fn(),
  findByPublicKey: jest.fn().mockImplementation((publicKey) => {
    // Return a keyRefId for any public key by default
    // Tests can override this behavior as needed
    if (publicKey === 'operator-public-key') {
      return {
        keyRefId: 'operator-key-ref-id',
        keyManager: KeyManager.local,
        publicKey: ED25519_HEX_PUBLIC_KEY,
        labels: ['operator:public-key'],
        keyAlgorithm: KeyAlgorithm.ED25519,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    if (publicKey === 'admin-key') {
      return {
        keyRefId: 'admin-key-ref-id',
        keyManager: KeyManager.local,
        publicKey: ED25519_HEX_PUBLIC_KEY,
        labels: ['account:create'],
        keyAlgorithm: KeyAlgorithm.ED25519,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    if (publicKey === 'test-admin-key') {
      return {
        keyRefId: 'admin-key-ref-id',
        keyManager: KeyManager.local,
        publicKey: ED25519_HEX_PUBLIC_KEY,
        labels: ['account:update'],
        keyAlgorithm: KeyAlgorithm.ED25519,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    if (publicKey === 'test-public-key') {
      return {
        keyRefId: 'test-key-ref-id',
        keyManager: KeyManager.local,
        publicKey: ED25519_HEX_PUBLIC_KEY,
        labels: ['token:test'],
        keyAlgorithm: KeyAlgorithm.ED25519,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    if (publicKey === 'treasury-public-key') {
      return {
        keyRefId: 'treasury-key-ref-id',
        keyManager: KeyManager.local,
        publicKey: ED25519_HEX_PUBLIC_KEY,
        labels: ['token:treasury'],
        keyAlgorithm: KeyAlgorithm.ED25519,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return undefined;
  }),
  get: jest.fn().mockReturnValue({
    keyRefId: 'treasury-key-ref-id',
    keyManager: KeyManager.local,
    publicKey: ED25519_HEX_PUBLIC_KEY,
    labels: ['token:treasury'],
    keyAlgorithm: KeyAlgorithm.ED25519,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  list: jest.fn().mockReturnValue([]),
  remove: jest.fn(),

  createClient: jest.fn(),
  signTransaction: jest.fn(),
  signContractCreateFlow: jest.fn(),
  hasPrivateKey: jest.fn().mockReturnValue(true),
  ...overrides,
});

/**
 * Alias account data structure for mock implementations
 */
interface AliasAccountData {
  entityId: string;
  publicKey: string;
  keyRefId: string;
}

/**
 * Create a mocked AliasService
 */
export const makeAliasServiceMock = (
  overrides?: Partial<jest.Mocked<AliasService>>,
): jest.Mocked<AliasService> => ({
  register: jest.fn(),
  resolve: jest.fn().mockImplementation((alias, type) => {
    if (type === AliasType.Account) {
      const accountAliases: Record<string, AliasAccountData> = {
        'admin-key': {
          entityId: '0.0.100000',
          publicKey: '302a300506032b6570032100' + '0'.repeat(64),
          keyRefId: 'admin-key-ref-id',
        },
        'test-admin-key': {
          entityId: '0.0.100000',
          publicKey: '302a300506032b6570032100' + '0'.repeat(64),
          keyRefId: 'admin-key-ref-id',
        },
        'treasury-account': {
          entityId: '0.0.123456',
          publicKey: '302a300506032b6570032100' + '1'.repeat(64),
          keyRefId: 'treasury-key-ref-id',
        },
        'admin-account': {
          entityId: '0.0.100000',
          publicKey: '302a300506032b6570032100' + '2'.repeat(64),
          keyRefId: 'admin-key-ref-id',
        },
        alice: {
          entityId: '0.0.200000',
          publicKey: '302a300506032b6570032100' + '3'.repeat(64),
          keyRefId: 'alice-key-ref-id',
        },
        bob: {
          entityId: '0.0.300000',
          publicKey: '302a300506032b6570032100' + '4'.repeat(64),
          keyRefId: 'bob-key-ref-id',
        },
        'my-account-alias': {
          entityId: '0.0.789012',
          publicKey: '302a300506032b6570032100' + '5'.repeat(64),
          keyRefId: 'my-account-key-ref-id',
        },
        TestAccount: {
          entityId: '0.0.345678',
          publicKey: '302a300506032b6570032100' + '6'.repeat(64),
          keyRefId: 'test-account-key-ref-id',
        },
        'Account 1': {
          entityId: '0.0.9999',
          publicKey: '302a300506032b6570032100' + '7'.repeat(64),
          keyRefId: 'account-1-key-ref-id',
        },
      };
      return accountAliases[alias] || null;
    }
    if (type === AliasType.Token) {
      const tokenAliases: Record<string, { entityId: string }> = {
        'my-token': { entityId: '0.0.12345' },
        'my-nft-collection': { entityId: '0.0.54321' },
        'test-fungible': { entityId: '0.0.99999' },
      };
      return tokenAliases[alias] || null;
    }
    return null;
  }),
  resolveOrThrow: jest.fn(),
  resolveByEvmAddress: jest.fn().mockReturnValue(null),
  list: jest.fn().mockReturnValue([]),
  remove: jest.fn(),
  clear: jest.fn(),
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
      updateAccount: jest.fn(),
      deleteAccount: jest.fn(),
      getAccountInfo: jest.fn(),
      getAccountBalance: jest.fn(),
    }) as jest.Mocked<AccountService>;

/**
 * Configuration options for makeApiMocks
 */
interface ApiMocksConfig {
  tokens?: Partial<jest.Mocked<TokenService>>;
  tokenTransactions?: Partial<jest.Mocked<TokenService>>;
  txSign?: Partial<jest.Mocked<TxSignService>>;
  txExecute?: Partial<jest.Mocked<TxExecuteService>>;
  kms?: Partial<jest.Mocked<KmsService>>;
  alias?: Partial<jest.Mocked<AliasService>>;
  state?: Partial<jest.Mocked<StateService>>;
  mirror?: Record<string, jest.Mock>;
  network?: string;
  createTransferImpl?: jest.Mock;
  keyResolver?: Partial<jest.Mocked<KeyResolverService>>;
  contract?: Partial<jest.Mocked<ContractTransactionService>>;
  contractCompiler?: Partial<jest.Mocked<ContractCompilerService>>;
  contractVerifier?: Partial<jest.Mocked<ContractVerifierService>>;
  contractQuery?: Partial<jest.Mocked<ContractQueryService>>;
  identityResolution?: Partial<jest.Mocked<IdentityResolutionService>>;
}

/**
 * Create a complete mocked CoreApi with configurable services
 */
export const makeApiMocks = (config?: ApiMocksConfig) => {
  const tokens = makeTokenServiceMock(
    config?.tokens || config?.tokenTransactions,
  );
  const txSign = makeTxSignServiceMock(config?.txSign);
  const txExecute = makeTxExecuteServiceMock(config?.txExecute);
  const kms = makeKmsMock(config?.kms);
  const alias = makeAliasServiceMock(config?.alias);
  const state = makeStateServiceMock(config?.state);
  const account = makeAccountTransactionServiceMock();

  const networkMock = {
    getCurrentNetwork: jest.fn().mockReturnValue(config?.network || 'testnet'),
    getOperator: jest.fn().mockReturnValue({
      accountId: '0.0.100000',
      keyRefId: 'operator-key-ref-id',
    }),
    getCurrentOperatorOrThrow: jest.fn().mockReturnValue({
      accountId: '0.0.100000',
      keyRefId: 'operator-key-ref-id',
    }),
  };
  const keyResolver = makeGlobalKeyResolverMock({
    network: networkMock as unknown as NetworkService,
    alias,
    kms,
  });

  const api: jest.Mocked<CoreApi> = {
    account,
    token: tokens,
    topic: {} as unknown as TopicService,
    txSign,
    txExecute,
    batch: {
      createBatchTransaction: jest.fn(),
    } as unknown as BatchTransactionService,
    receipt: {
      getReceipt: jest.fn(),
    } as unknown as ReceiptService,
    kms,
    alias,
    state,
    // Mirror service minimal mock - only getTokenInfo used

    mirror: {
      getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
      ...(config?.mirror || {}),
    } as unknown as HederaMirrornodeService,
    network: {
      ...networkMock,
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
      handleOutput: jest.fn<never, [OutputHandlerOptions]>(),
      getFormat: jest.fn().mockReturnValue('human'),
      setFormat: jest.fn(),
      emptyLine: jest.fn(),
    } as jest.Mocked<OutputService>,
    pluginManagement: {
      listPlugins: jest.fn().mockReturnValue([]),
      getPlugin: jest.fn(),
      addPlugin: jest.fn(),
      removePlugin: jest.fn(),
      enablePlugin: jest.fn(),
      disablePlugin: jest.fn(),
      resetPlugins: jest.fn(),
      savePluginState: jest.fn(),
      getInitializedDefaults: jest.fn().mockReturnValue([]),
      setInitializedDefaults: jest.fn(),
      addToInitializedDefaults: jest.fn(),
    } as PluginManagementService,
    contract: {
      contractCreateFlowTransaction: jest.fn(),
    } as unknown as ContractTransactionService,
    contractCompiler: {
      compileContract: jest.fn(),
    } as ContractCompilerService,
    contractVerifier: {
      verifyContract: jest.fn(),
      isVerifiedFullMatchOnRepository: jest.fn().mockResolvedValue(false),
      ...(config?.contractVerifier || {}),
    } as ContractVerifierService,
    contractQuery: {
      queryContractFunction: jest.fn(),
    } as ContractQueryService,
    identityResolution: {
      ...makeGlobalIdentityResolutionServiceMock(),
      ...(config?.identityResolution || {}),
    },
    schedule: makeScheduleTransactionServiceMock(),
    keyResolver,
  };

  return {
    api,
    tokens,
    tokenTransactions: tokens,
    txSign,
    txExecute,
    kms,
    alias,
    state,
    account,
    keyResolver,
    createTransferImpl: config?.createTransferImpl,
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
    contractId?: string;
  }>,
) => ({
  success: overrides?.success ?? true,
  transactionId: overrides?.transactionId ?? '0.0.123@1234567890.123456789',
  consensusTimestamp: '2024-01-01T00:00:00.000Z',
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
      throw new InternalError(`Process.exit(${code})`);
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
  ZustandTokenStateHelperClass: jest.Mock,
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
    fs: Record<string, unknown>,
    path: Record<string, unknown>,
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
    tokens?: Array<unknown>;
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
        withKeys: 0,
        byNetwork: {},
        bySupplyType: {},
        withAssociations: 0,
        totalAssociations: 0,
      },
    ),
  }));
};

/**
 * Setup mock implementation for ZustandTokenStateHelper for delete tests
 */
export const setupDeleteZustandHelperMock = (
  MockedHelperClass: jest.Mock,
  config: {
    getToken?: jest.Mock;
    removeToken?: jest.Mock;
  },
) => {
  MockedHelperClass.mockImplementation(() => ({
    getToken: config.getToken ?? jest.fn().mockReturnValue(null),
    removeToken: config.removeToken ?? jest.fn(),
  }));
};

/**
 * Create API mocks specifically for delete token tests
 * Provides sensible defaults for identityResolution and alias services
 */
export const makeDeleteApiMocks = (
  config?: ApiMocksConfig & {
    entityId?: string;
    resolveReferenceToEntityOrEvmAddressError?: Error;
  },
) => {
  const entityId = config?.entityId;
  const resolveError = config?.resolveReferenceToEntityOrEvmAddressError;

  return makeApiMocks({
    network: 'testnet',
    alias: {
      list: jest.fn().mockReturnValue([]),
      ...config?.alias,
    },
    identityResolution: {
      resolveReferenceToEntityOrEvmAddress: jest.fn().mockImplementation(() => {
        if (resolveError) {
          throw resolveError;
        }
        const id = entityId ?? '0.0.1111';
        return { entityIdOrEvmAddress: id };
      }),
      ...config?.identityResolution,
    },
    ...config,
  });
};

/**
 * Create API mocks configured for successful mint-ft operations
 * Provides default mocks for token minting with configurable overrides
 */
export const makeMintFtSuccessMocks = (overrides?: {
  tokenInfo?: {
    decimals?: string;
    supply_key?: { _type?: MirrorNodeKeyType; key: string } | null;
    total_supply?: string;
    max_supply?: string;
  };
  signResult?: ReturnType<typeof makeTransactionResult>;
  supplyKeyPublicKey?: string;
}) => {
  const mockMintTransaction = { test: 'mint-transaction' };
  const defaultSupplyKeyPublicKey =
    overrides?.supplyKeyPublicKey ?? ED25519_HEX_PUBLIC_KEY;

  const supplyKeyFromMirror =
    overrides?.tokenInfo?.supply_key === null
      ? null
      : overrides?.tokenInfo?.supply_key
        ? {
            _type:
              overrides.tokenInfo.supply_key._type ?? MirrorNodeKeyType.ED25519,
            key: overrides.tokenInfo.supply_key.key,
          }
        : {
            _type: MirrorNodeKeyType.ED25519,
            key: defaultSupplyKeyPublicKey,
          };

  const apiMocks = makeApiMocks({
    tokens: {
      createMintTransaction: jest.fn().mockReturnValue(mockMintTransaction),
    },
    txExecute: {
      execute: jest
        .fn()
        .mockResolvedValue(
          overrides?.signResult || makeTransactionResult({ success: true }),
        ),
    },
    mirror: {
      getTokenInfo: jest.fn().mockResolvedValue({
        decimals: overrides?.tokenInfo?.decimals ?? '2',
        supply_key: supplyKeyFromMirror,
        total_supply: overrides?.tokenInfo?.total_supply ?? '1000000',
        max_supply: overrides?.tokenInfo?.max_supply ?? '0',
      }),
    },
    alias: {
      resolve: jest.fn().mockReturnValue(null),
    },
    kms: {
      importPrivateKey: jest.fn().mockReturnValue({
        keyRefId: 'supply-key-ref-id',
        publicKey: defaultSupplyKeyPublicKey,
      }),
    },
  });

  apiMocks.keyResolver.resolveSigningKey = jest.fn().mockResolvedValue({
    accountId: '0.0.200000',
    publicKey: defaultSupplyKeyPublicKey,
    keyRefId: 'supply-key-ref-id',
  });

  return {
    ...apiMocks,
    mockMintTransaction,
  };
};

export const makeMintNftSuccessMocks = (overrides?: {
  tokenInfo?: {
    decimals?: string;
    supply_key?: { _type?: MirrorNodeKeyType; key: string } | null;
    total_supply?: string;
    max_supply?: string;
    type?: string;
  };
  signResult?: ReturnType<typeof makeTransactionResult> & {
    receipt?: { serials?: string[] };
  };
  supplyKeyPublicKey?: string;
}) => {
  const mockMintTransaction = { test: 'mint-nft-transaction' };
  const defaultSupplyKeyPublicKey =
    overrides?.supplyKeyPublicKey ?? ED25519_HEX_PUBLIC_KEY;

  const supplyKeyFromMirror =
    overrides?.tokenInfo?.supply_key === null
      ? null
      : overrides?.tokenInfo?.supply_key
        ? {
            _type:
              overrides.tokenInfo.supply_key._type ?? MirrorNodeKeyType.ED25519,
            key: overrides.tokenInfo.supply_key.key,
          }
        : {
            _type: MirrorNodeKeyType.ED25519,
            key: defaultSupplyKeyPublicKey,
          };

  const defaultSignResult = makeTransactionResult({ success: true });
  const signResult = overrides?.signResult || {
    ...defaultSignResult,
    receipt: {
      ...defaultSignResult.receipt,
      serials: ['1'],
    },
  };

  const apiMocks = makeApiMocks({
    tokens: {
      createMintTransaction: jest.fn().mockReturnValue(mockMintTransaction),
    },
    txExecute: {
      execute: jest.fn().mockResolvedValue(signResult),
    },
    mirror: {
      getTokenInfo: jest.fn().mockResolvedValue({
        decimals: overrides?.tokenInfo?.decimals ?? '0',
        type: overrides?.tokenInfo?.type ?? 'NON_FUNGIBLE_UNIQUE',
        supply_key: supplyKeyFromMirror,
        total_supply: overrides?.tokenInfo?.total_supply ?? '0',
        max_supply: overrides?.tokenInfo?.max_supply ?? '0',
      }),
    },
    alias: {
      resolve: jest.fn().mockReturnValue(null),
    },
    kms: {
      importPrivateKey: jest.fn().mockReturnValue({
        keyRefId: 'supply-key-ref-id',
        publicKey: defaultSupplyKeyPublicKey,
      }),
    },
  });

  apiMocks.keyResolver.resolveSigningKey = jest.fn().mockResolvedValue({
    accountId: '0.0.200000',
    publicKey: defaultSupplyKeyPublicKey,
    keyRefId: 'supply-key-ref-id',
  });

  return {
    ...apiMocks,
    mockMintTransaction,
  };
};

export const makeDeleteSuccessMocks = (overrides?: {
  tokenInfo?: {
    admin_key?: { key: string } | null;
    name?: string;
  };
  adminKeyPublicKey?: string;
}) => {
  const mockDeleteTransaction = { test: 'delete-transaction' };
  const defaultMirrorAdminHex = ED25519_HEX_PUBLIC_KEY;
  const defaultAdminKeyRaw = PublicKey.fromString(
    defaultMirrorAdminHex,
  ).toStringRaw();
  const resolverPublicKeyRaw =
    overrides?.adminKeyPublicKey !== undefined
      ? PublicKey.fromString(overrides.adminKeyPublicKey).toStringRaw()
      : defaultAdminKeyRaw;

  const apiMocks = makeApiMocks({
    tokens: {
      createDeleteTransaction: jest.fn().mockReturnValue(mockDeleteTransaction),
    },
    txExecute: {
      execute: jest
        .fn()
        .mockResolvedValue(makeTransactionResult({ success: true })),
    },
    mirror: {
      getTokenInfo: jest.fn().mockResolvedValue({
        admin_key:
          overrides?.tokenInfo && 'admin_key' in overrides.tokenInfo
            ? overrides.tokenInfo.admin_key
            : {
                _type: 'ED25519',
                key: overrides?.adminKeyPublicKey ?? defaultMirrorAdminHex,
              },
        name: overrides?.tokenInfo?.name ?? 'TestToken',
      }),
    },
    alias: makeAliasServiceMock({
      list: jest.fn().mockReturnValue([]),
    }),
  });

  apiMocks.keyResolver.resolveSigningKey = jest.fn().mockResolvedValue({
    accountId: '0.0.200000',
    publicKey: resolverPublicKeyRaw,
    keyRefId: 'admin-key-ref-id',
  });

  apiMocks.kms.findByPublicKey = jest
    .fn()
    .mockImplementation((publicKey: string) =>
      publicKey === defaultAdminKeyRaw
        ? {
            keyRefId: 'kms-key-ref-id',
            publicKey: defaultAdminKeyRaw,
            keyManager: KeyManager.local,
            keyAlgorithm: KeyAlgorithm.ED25519,
            createdAt: '',
            updatedAt: '',
          }
        : undefined,
    );

  return { ...apiMocks, mockDeleteTransaction };
};

/**
 * Create API mocks configured for successful burn-ft operations
 */
export const makeBurnNftSuccessMocks = (overrides?: {
  tokenInfo?: {
    supply_key?: { key: string } | null;
    total_supply?: string;
    max_supply?: string;
  };
  signResult?: ReturnType<typeof makeTransactionResult>;
  supplyKeyPublicKey?: string;
}) => {
  const mockBurnNftTransaction = { test: 'burn-nft-transaction' };
  const defaultSupplyKeyPublicKey =
    overrides?.supplyKeyPublicKey ?? 'supply-public-key';

  const apiMocks = makeApiMocks({
    tokens: {
      createBurnNftTransaction: jest
        .fn()
        .mockReturnValue(mockBurnNftTransaction),
    },
    txExecute: {
      execute: jest
        .fn()
        .mockResolvedValue(
          overrides?.signResult || makeTransactionResult({ success: true }),
        ),
    },
    mirror: {
      getTokenInfo: jest.fn().mockResolvedValue({
        decimals: '0',
        type: 'NON_FUNGIBLE_UNIQUE',
        supply_key: overrides?.tokenInfo?.supply_key ?? {
          key: defaultSupplyKeyPublicKey,
        },
        total_supply: overrides?.tokenInfo?.total_supply ?? '10',
        max_supply: overrides?.tokenInfo?.max_supply ?? '0',
      }),
    },
    alias: {
      resolve: jest.fn().mockReturnValue(null),
    },
    kms: {
      importPrivateKey: jest.fn().mockReturnValue({
        keyRefId: 'supply-key-ref-id',
        publicKey: defaultSupplyKeyPublicKey,
      }),
    },
  });

  apiMocks.keyResolver.resolveSigningKey = jest.fn().mockResolvedValue({
    accountId: '0.0.200000',
    publicKey: defaultSupplyKeyPublicKey,
    keyRefId: 'supply-key-ref-id',
  });

  return {
    ...apiMocks,
    mockBurnNftTransaction,
  };
};

export const makeBurnFtSuccessMocks = (overrides?: {
  tokenInfo?: {
    decimals?: string;
    supply_key?: { key: string } | null;
    total_supply?: string;
    max_supply?: string;
  };
  signResult?: ReturnType<typeof makeTransactionResult>;
  supplyKeyPublicKey?: string;
}) => {
  const mockBurnTransaction = { test: 'burn-transaction' };
  const defaultSupplyKeyPublicKey =
    overrides?.supplyKeyPublicKey ?? 'supply-public-key';

  const apiMocks = makeApiMocks({
    tokens: {
      createBurnFtTransaction: jest.fn().mockReturnValue(mockBurnTransaction),
    },
    txExecute: {
      execute: jest
        .fn()
        .mockResolvedValue(
          overrides?.signResult || makeTransactionResult({ success: true }),
        ),
    },
    mirror: {
      getTokenInfo: jest.fn().mockResolvedValue({
        decimals: overrides?.tokenInfo?.decimals ?? '2',
        supply_key: overrides?.tokenInfo?.supply_key ?? {
          key: defaultSupplyKeyPublicKey,
        },
        total_supply: overrides?.tokenInfo?.total_supply ?? '1000000',
        max_supply: overrides?.tokenInfo?.max_supply ?? '0',
      }),
    },
    alias: {
      resolve: jest.fn().mockReturnValue(null),
    },
    kms: {
      importPrivateKey: jest.fn().mockReturnValue({
        keyRefId: 'supply-key-ref-id',
        publicKey: defaultSupplyKeyPublicKey,
      }),
    },
  });

  apiMocks.keyResolver.resolveSigningKey = jest.fn().mockResolvedValue({
    accountId: '0.0.200000',
    publicKey: defaultSupplyKeyPublicKey,
    keyRefId: 'supply-key-ref-id',
  });

  return {
    ...apiMocks,
    mockBurnTransaction,
  };
};
