/**
 * Core Test Helpers and Mocks
 * Shared mocks for core services and utilities used across all plugin tests
 */
import type { CommandHandlerArgs } from '../../core/plugins/plugin.interface';
import type { CoreApi } from '../../core/core-api/core-api.interface';
import type { Logger } from '../../core/services/logger/logger-service.interface';
import type { StateService } from '../../core/services/state/state-service.interface';
import type { ConfigService } from '../../core/services/config/config-service.interface';
import type { NetworkService } from '../../core/services/network/network-service.interface';
import type { KmsService } from '../../core/services/kms/kms-service.interface';
import type { AliasService } from '../../core/services/alias/alias-service.interface';
import type { TxExecutionService } from '../../core/services/tx-execution/tx-execution-service.interface';
import type { HederaMirrornodeService } from '../../core/services/mirrornode/hedera-mirrornode-service.interface';
import type { OutputService } from '../../core/services/output/output-service.interface';
import type { HbarService } from '../../core/services/hbar/hbar-service.interface';
import type { PluginManagementService } from '../../core/services/plugin-management/plugin-management-service.interface';

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
  network: 'testnet' | 'mainnet' | 'previewnet' = 'testnet',
): jest.Mocked<NetworkService> => ({
  getCurrentNetwork: jest.fn().mockReturnValue(network),
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
  getPublicKey: jest.fn(),
  getSignerHandle: jest.fn(),
  findByPublicKey: jest.fn(),
  list: jest.fn(),
  remove: jest.fn(),
  createClient: jest.fn(),
  signTransaction: jest.fn(),
});

/**
 * Create a mocked AliasService
 */
export const makeAliasMock = (): jest.Mocked<AliasService> => ({
  register: jest.fn(),
  resolve: jest.fn().mockReturnValue(null), // No alias resolution by default
  list: jest.fn(),
  remove: jest.fn(),
  exists: jest.fn().mockReturnValue(false), // Alias doesn't exist by default
  availableOrThrow: jest.fn(),
  clear: jest.fn(),
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
});

/**
 * Create a mocked StateService
 */
export const makeStateMock = (
  options: {
    listData?: unknown[];
  } = {},
): Partial<StateService> => ({
  list: jest.fn().mockReturnValue(options.listData || []),
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
});

/**
 * Create a mocked HederaMirrornodeService
 */
export const makeMirrorMock = (
  options: {
    hbarBalance?: bigint;
    tokenBalances?: { token_id: string; balance: number }[];
    tokenError?: Error;
    accountInfo?: any;
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
): CommandHandlerArgs => ({
  api: {
    account: {} as any,
    token: {} as any,
    txExecution: makeSigningMock(),
    topic: {
      createTopic: jest.fn(),
      submitMessage: jest.fn(),
    } as any,
    state: {} as any,
    mirror: {} as any,
    network: makeNetworkMock('testnet'),
    config: makeConfigMock(),
    logger,
    alias: makeAliasMock(),
    kms: makeKmsMock(),
    hbar: makeHbarMock(),
    output: makeOutputMock(),
    pluginManagement: makePluginManagementServiceMock(),
    ...api,
  },
  logger,
  state: {} as StateService,
  config: makeConfigMock(),
  args,
});

/**
 * Setup and teardown for process.exit spy
 */
export const setupExitSpy = (): jest.SpyInstance => {
  return jest.spyOn(process, 'exit').mockImplementation(() => {
    return undefined as never;
  });
};
