/**
 * Core Test Helpers and Mocks
 * Shared mocks for core services and utilities used across all plugin tests
 */
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type {
  AliasRecord,
  AliasService,
} from '@/core/services/alias/alias-service.interface';
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
import type { ContractInfo } from '@/core/services/mirrornode/types';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { OutputService } from '@/core/services/output/output-service.interface';
import type { PluginManagementService } from '@/core/services/plugin-management/plugin-management-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type {
  TransactionResult,
  TxExecutionService,
} from '@/core/services/tx-execution/tx-execution-service.interface';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';

import {
  MOCK_CONTRACT_ID,
  MOCK_EVM_ADDRESS,
  MOCK_PUBLIC_KEY,
  MOCK_TOPIC_ID,
} from './fixtures';

/**
 * Alias account data structure
 */
interface AccountAlias {
  entityId: string;
  publicKey: string;
  keyRefId: string;
}

/**
 * Account info structure for mirror node mock
 */
interface AccountInfo {
  accountId: string;
  balance: { balance: number; timestamp: string };
  evmAddress: string;
  accountPublicKey: string;
  keyAlgorithm: KeyAlgorithm;
}

/**
 * Create a mocked Logger instance
 */
export const makeLogger = (): jest.Mocked<Logger> => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  setLevel: jest.fn(),
});

/**
 * Create a mocked NetworkService
 */
export const makeNetworkMock = (
  network:
    | SupportedNetwork
    | 'testnet'
    | 'mainnet'
    | 'previewnet'
    | 'localnet' = SupportedNetwork.TESTNET,
): jest.Mocked<NetworkService> => ({
  getCurrentNetwork: jest.fn().mockReturnValue(network),
  setNetwork: jest.fn(),
  getAvailableNetworks: jest
    .fn()
    .mockReturnValue(['localnet', 'testnet', 'previewnet', 'mainnet']),
  switchNetwork: jest.fn(),
  getNetworkConfig: jest.fn().mockImplementation((name: string) => ({
    name,
    rpcUrl: `https://${name}.hashio.io/api`,
    mirrorNodeUrl: `https://${name}.mirrornode.hedera.com/api/v1`,
    chainId: name === 'mainnet' ? '0x127' : '0x128',
    explorerUrl: `https://hashscan.io/${name}`,
    isTestnet: name !== 'mainnet',
  })),
  isNetworkAvailable: jest.fn().mockReturnValue(true),
  getLocalnetConfig: jest.fn().mockReturnValue({
    localNodeAddress: '127.0.0.1:50211',
    localNodeAccountId: '0.0.3',
    localNodeMirrorAddressGRPC: '127.0.0.1:5600',
  }),
  setOperator: jest.fn(),
  getOperator: jest.fn().mockReturnValue(null),
  getCurrentOperatorOrThrow: jest.fn().mockReturnValue({
    accountId: '0.0.100000',
    keyRefId: 'operator-key-ref-id',
  }),
  setPayer: jest.fn(),
  getPayer: jest.fn().mockReturnValue(null),
  hasAnyOperator: jest.fn().mockReturnValue(false),
});

/**
 * Create a mocked KeyManagementService
 */
export const makeKmsMock = (): jest.Mocked<KmsService> => ({
  createLocalPrivateKey: jest.fn(),
  importPrivateKey: jest.fn().mockReturnValue({
    keyRefId: 'kr_test123',
    publicKey: 'pub-key-test',
  }),
  importAndValidatePrivateKey: jest.fn().mockReturnValue({
    keyRefId: 'kr_test123',
    publicKey: 'pub-key-test',
  }),
  getPublicKey: jest.fn(),
  getSignerHandle: jest.fn(),
  findByPublicKey: jest.fn(),
  list: jest.fn(),
  remove: jest.fn(),
  createClient: jest.fn(),
  signTransaction: jest.fn(),
  signContractCreateFlow: jest.fn(),
});

/**
 * Create a mocked AliasService
 */
export const makeAliasMock = (): jest.Mocked<AliasService> => ({
  register: jest.fn(),
  resolve: jest.fn().mockImplementation((alias, type) => {
    // Domyślnie zwracaj dane dla typowych aliasów używanych w testach
    if (type === 'account') {
      const accountAliases: Record<string, AccountAlias> = {
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
        'supply-key': {
          entityId: '0.0.300000',
          publicKey: '302a300506032b6570032100' + '8'.repeat(64),
          keyRefId: 'supply-key-ref-id',
        },
      };
      return accountAliases[alias] || null;
    }
    return null;
  }),
  resolveOrThrow: jest.fn().mockReturnValue({
    entityId: '0.0.1234',
    alias: 'default',
    type: 'contract',
    network: 'testnet',
    createdAt: '2024-01-01T00:00:00.000Z',
  }),
  resolveByEvmAddress: jest.fn().mockReturnValue(null),
  list: jest.fn(),
  remove: jest.fn(),
  exists: jest.fn().mockReturnValue(false),
  availableOrThrow: jest.fn(),
  clear: jest.fn(),
});

export const mockTopicAliasRecord: AliasRecord = {
  alias: 'topic-alias-testnet',
  type: ALIAS_TYPE.Topic,
  network: SupportedNetwork.TESTNET,
  entityId: MOCK_TOPIC_ID,
  createdAt: '2024-01-01T00:00:00.000Z',
};

/**
 * Create a mocked ContractQueryService
 */
export const makeContractQueryServiceMock =
  (): jest.Mocked<ContractQueryService> => ({
    queryContractFunction: jest.fn(),
  });

/**
 * Create a mocked IdentityResolutionService
 */
export const makeIdentityResolutionServiceMock =
  (): jest.Mocked<IdentityResolutionService> => ({
    resolveAccount: jest.fn(),
    resolveContract: jest.fn(),
    resolveReferenceToEntityOrEvmAddress: jest.fn(),
  });

/**
 * Create a mocked TxExecutionService
 */
export const makeSigningMock = (
  options: {
    signAndExecuteImpl?: jest.Mock;
  } = {},
): jest.Mocked<TxExecutionService> => ({
  signAndExecute:
    options.signAndExecuteImpl ||
    jest.fn().mockResolvedValue({
      success: true,
      transactionId: 'mock-tx-id',
      receipt: { status: { status: 'success' } },
    }),
  signAndExecuteWith:
    options.signAndExecuteImpl ||
    jest.fn().mockResolvedValue({
      success: true,
      transactionId: 'mock-tx-id',
      receipt: { status: { status: 'success' } },
    }),
  signAndExecuteContractCreateFlowWith:
    options.signAndExecuteImpl ||
    jest.fn().mockResolvedValue({
      success: true,
      transactionId: 'mock-tx-id',
      receipt: { status: { status: 'success' } },
    }),
});

/**
 * Create mock TransactionResult
 */
export const makeTransactionResultMock = (
  overrides?: Partial<TransactionResult>,
): TransactionResult => ({
  success: true,
  transactionId: 'mock-tx-id',
  consensusTimestamp: '2024-01-01T00:00:00.000Z',
  receipt: {
    status: {
      status: 'success' as const,
      transactionId: 'mock-tx-id',
    },
  },
  ...overrides,
});

export const createMirrorNodeMock =
  (): jest.Mocked<HederaMirrornodeService> => ({
    getAccount: jest.fn(),
    getAccountHBarBalance: jest.fn(),
    getAccountTokenBalances: jest.fn(),
    getTopicMessage: jest.fn(),
    getTopicMessages: jest.fn(),
    getTokenInfo: jest.fn(),
    getNftInfo: jest.fn(),
    getTopicInfo: jest.fn(),
    getTransactionRecord: jest.fn(),
    getContractInfo: jest.fn(),
    getPendingAirdrops: jest.fn(),
    getOutstandingAirdrops: jest.fn(),
    getExchangeRate: jest.fn(),
    postContractCall: jest.fn(),
  });

/**
 * Create a mocked StateService
 */
export const makeStateMock = (
  options: {
    listData?: unknown[];
  } = {},
): jest.Mocked<StateService> => ({
  list: jest.fn().mockReturnValue(options.listData || []),
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  has: jest.fn(),
  getNamespaces: jest.fn().mockReturnValue([]),
  getKeys: jest.fn().mockReturnValue([]),
  subscribe: jest.fn(),
  getActions: jest.fn(),
  getState: jest.fn(),
  getStorageDirectory: jest.fn().mockReturnValue(''),
  isInitialized: jest.fn().mockReturnValue(true),
});

/**
 * Create a mocked HederaMirrornodeService
 */
export const makeMirrorMock = (
  options: {
    hbarBalance?: bigint;
    tokenBalances?: { token_id: string; balance: number }[];
    tokenError?: Error;
    accountInfo?: AccountInfo;
    getAccountImpl?: jest.Mock;
    tokenInfo?: Record<
      string,
      { name: string; symbol: string; decimals: string }
    >;
  } = {},
): Partial<HederaMirrornodeService> => ({
  getAccountHBarBalance: jest.fn().mockResolvedValue(options.hbarBalance ?? 0n),
  getAccountTokenBalances: options.tokenError
    ? jest.fn().mockRejectedValue(options.tokenError)
    : jest.fn().mockResolvedValue({ tokens: options.tokenBalances ?? [] }),
  getAccount:
    options.getAccountImpl ||
    jest.fn().mockResolvedValue(
      options.accountInfo ?? {
        accountId: '0.0.1234',
        balance: { balance: 1000, timestamp: '1234567890' },
        evmAddress: '0xabc',
        accountPublicKey: 'pubKey',
        keyAlgorithm: KeyAlgorithm.ECDSA,
      },
    ),
  getTokenInfo: jest.fn().mockImplementation((tokenId: string) => {
    if (options.tokenInfo && options.tokenInfo[tokenId]) {
      return Promise.resolve({
        token_id: tokenId,
        ...options.tokenInfo[tokenId],
        total_supply: '1000000',
        max_supply: '1000000',
        treasury: '0.0.1234',
        created_timestamp: '1234567890',
        deleted: false,
        default_freeze_status: false,
        default_kyc_status: false,
        pause_status: 'NOT_APPLICABLE',
        memo: '',
      });
    }
    return Promise.resolve({
      token_id: tokenId,
      name: `Token ${tokenId}`,
      symbol: 'TKN',
      decimals: '8',
      total_supply: '1000000',
      max_supply: '1000000',
      treasury: '0.0.1234',
      created_timestamp: '1234567890',
      deleted: false,
      default_freeze_status: false,
      default_kyc_status: false,
      pause_status: 'NOT_APPLICABLE',
      memo: '',
    });
  }),
});

/**
 * Create a mocked HbarService
 */
const makeHbarMock = (): jest.Mocked<HbarService> => ({
  transferTinybar: jest.fn(),
});

/**
 * Create a mocked OutputService
 */
const makeOutputMock = (): jest.Mocked<OutputService> => ({
  handleCommandOutput: jest.fn(),
  setFormat: jest.fn(),
  getFormat: jest.fn().mockReturnValue('human'),
  emptyLine: jest.fn(),
});

const makePluginManagementServiceMock = (): PluginManagementService =>
  ({
    listPlugins: jest.fn().mockReturnValue([]),
    getPlugin: jest.fn(),
    addPlugin: jest.fn(),
    removePlugin: jest.fn(),
    enablePlugin: jest.fn(),
    disablePlugin: jest.fn(),
    savePluginState: jest.fn(),
  }) as unknown as PluginManagementService;

const makeContractTransactionServiceMock = (): ContractTransactionService =>
  ({
    contractCreateFlowTransaction: jest.fn(),
  }) as unknown as ContractTransactionService;

const makeContractVerifierServiceMock = (): ContractVerifierService =>
  ({
    verifyContract: jest.fn(),
  }) as unknown as ContractVerifierService;

const makeContractCompilerServiceMock = (): ContractCompilerService =>
  ({
    compileContract: jest.fn(),
  }) as unknown as ContractCompilerService;

/**
 * Create a mocked ConfigService
 */
export const makeConfigMock = (): jest.Mocked<ConfigService> => ({
  listOptions: jest.fn().mockReturnValue([]),
  getOption: jest.fn().mockReturnValue('local'), // Default key manager
  setOption: jest.fn(),
});

/**
 * Create CommandHandlerArgs for testing
 */
export const makeArgs = (
  api: Partial<CoreApi>,
  logger: jest.Mocked<Logger>,
  args: Record<string, unknown>,
): CommandHandlerArgs => {
  const network = api.network || makeNetworkMock(SupportedNetwork.TESTNET);
  const alias = api.alias || makeAliasMock();
  const kms = api.kms || makeKmsMock();
  const contract = api.contract || makeContractTransactionServiceMock();
  const contractCompiler =
    api.contractCompiler || makeContractCompilerServiceMock();
  const contractVerifier =
    api.contractVerifier || makeContractVerifierServiceMock();
  const contractQuery = api.contractQuery || makeContractQueryServiceMock();
  const identityResolution =
    api.identityResolution || makeIdentityResolutionServiceMock();

  const restApi = api;

  const apiObject = {
    account: {} as unknown,
    token: {} as unknown,
    txExecution: makeSigningMock(),
    topic: {
      createTopic: jest.fn(),
      submitMessage: jest.fn(),
    } as unknown,
    state: {
      list: jest.fn().mockReturnValue([]),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      has: jest.fn(),
      getNamespaces: jest.fn(),
      getKeys: jest.fn(),
      subscribe: jest.fn(),
      getActions: jest.fn(),
      getState: jest.fn(),
      getStorageDirectory: jest.fn().mockReturnValue(''),
      isInitialized: jest.fn().mockReturnValue(true),
    } as unknown as StateService,
    mirror: {
      setBaseUrl: jest.fn(),
      getAccount: jest.fn(),
      getAccountHBarBalance: jest.fn(),
      getAccountTokenBalances: jest.fn(),
      getTopicMessage: jest.fn(),
      getTopicMessages: jest.fn(),
      getTokenInfo: jest.fn(),
      getNftInfo: jest.fn(),
      getTopicInfo: jest.fn(),
      getTransactionRecord: jest.fn(),
      getContractInfo: jest.fn(),
      getPendingAirdrops: jest.fn(),
      getOutstandingAirdrops: jest.fn(),
      getExchangeRate: jest.fn(),
      postContractCall: jest.fn(),
    } as HederaMirrornodeService,
    network,
    config: makeConfigMock(),
    logger,
    alias,
    kms,
    hbar: makeHbarMock(),
    output: makeOutputMock(),
    pluginManagement: makePluginManagementServiceMock(),
    contract,
    contractCompiler,
    contractVerifier,
    keyResolver: makeKeyResolverMock({ network, alias, kms }),
    contractQuery,
    identityResolution,
    ...restApi,
  } as unknown as CoreApi;

  return {
    api: apiObject,
    logger,
    state: {
      list: jest.fn().mockReturnValue([]),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      has: jest.fn(),
      getNamespaces: jest.fn(),
      getKeys: jest.fn(),
      subscribe: jest.fn(),
      getActions: jest.fn(),
      getState: jest.fn(),
      getStorageDirectory: jest.fn().mockReturnValue(''),
      isInitialized: jest.fn().mockReturnValue(true),
    } as unknown as StateService,
    config: makeConfigMock(),
    args,
  };
};

/**
 * Setup and teardown for process.exit spy
 */
export const setupExitSpy = (): jest.SpyInstance => {
  return jest.spyOn(process, 'exit').mockImplementation(() => {
    return undefined as never;
  });
};

/**
 * Create a mocked KeyResolverService
 */
export const makeKeyResolverMock = (
  options: {
    network?: NetworkService;
    alias?: AliasService;
    kms?: KmsService;
    mirror?: HederaMirrornodeService;
  } = {},
): jest.Mocked<KeyResolverService> => ({
  getOrInitKey: jest
    .fn()
    // eslint-disable-next-line @typescript-eslint/require-await
    .mockImplementation(async (keyOrAlias, keyManager, labels) => {
      // accountId:privateKey format
      if (keyOrAlias?.type === 'keypair') {
        // Call kms.importPrivateKey if available
        if (options.kms?.importPrivateKey) {
          const importResult = options.kms.importPrivateKey(
            KeyAlgorithm.ECDSA,
            keyOrAlias.privateKey,
            keyManager,
            labels || [],
          );
          return {
            accountId: keyOrAlias.accountId,
            publicKey: MOCK_PUBLIC_KEY,
            keyRefId: importResult.keyRefId,
          };
        }
        return {
          accountId: keyOrAlias.accountId,
          publicKey: MOCK_PUBLIC_KEY,
          keyRefId: 'imported-key-ref-id',
        };
      }

      // alias format
      if (keyOrAlias?.type === 'alias' && options.alias) {
        const network =
          options.network?.getCurrentNetwork() || SupportedNetwork.TESTNET;
        const resolved = options.alias.resolve(
          keyOrAlias.alias,
          'account',
          network,
        );
        if (!resolved)
          throw new Error('No account is associated with the name provided.');
        if (!resolved.publicKey || !resolved.keyRefId || !resolved.entityId) {
          throw new Error(
            'The account associated with the alias does not have an associated private/public key or accountId',
          );
        }
        return {
          accountId: resolved.entityId,
          publicKey: resolved.publicKey,
          keyRefId: resolved.keyRefId,
        };
      }

      throw new Error('Invalid keyOrAlias');
    }),

  getOrInitKeyWithFallback: jest
    .fn()
    .mockImplementation(async (keyOrAlias, keyManager, labels) => {
      if (!keyOrAlias && options.network) {
        const operator = options.network.getCurrentOperatorOrThrow();
        // Always use default valid public key for mocking
        const publicKey = '302a300506032b6570032100' + '0'.repeat(64);
        return {
          accountId: operator.accountId,
          publicKey,
          keyRefId: operator.keyRefId,
        };
      }

      // delegate
      const resolver = makeKeyResolverMock(options);
      return resolver.getOrInitKey(keyOrAlias, keyManager, labels || []);
    }),
});

export const createMockContractInfo = (
  overrides: Partial<ContractInfo> = {},
): ContractInfo => ({
  contract_id: MOCK_CONTRACT_ID,
  account: '0.0.1234',
  created_timestamp: '2024-01-01T12:00:00.000Z',
  deleted: false,
  memo: 'test contract',
  evm_address: MOCK_EVM_ADDRESS,
  auto_renew_period: 7776000,
  max_automatic_token_associations: 0,
  ...overrides,
});
