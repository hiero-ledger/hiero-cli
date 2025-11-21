/**
 * Shared Mock Factory Functions for Account Plugin Tests
 * Provides reusable mocks for services, APIs, and common test utilities
 */
import type { CommandHandlerArgs } from '../../../../../core/plugins/plugin.interface';
import type { Logger } from '../../../../../core/services/logger/logger-service.interface';
import type { HederaMirrornodeService } from '../../../../../core/services/mirrornode/hedera-mirrornode-service.interface';
import type { CoreApi } from '../../../../../core/core-api/core-api.interface';
import type { AccountData } from '../../../schema';
import type { AccountService } from '../../../../../core/services/account/account-transaction-service.interface';
import type { TxExecutionService } from '../../../../../core/services/tx-execution/tx-execution-service.interface';
import type { NetworkService } from '../../../../../core/services/network/network-service.interface';
import type { AliasService } from '../../../../../core/services/alias/alias-service.interface';
import type { PluginManagementService } from '../../../../../core/services/plugin-management/plugin-management-service.interface';
import {
  makeNetworkMock as makeGlobalNetworkMock,
  makeKmsMock as makeGlobalKmsMock,
  makeAliasMock as makeGlobalAliasMock,
  makeSigningMock as makeGlobalSigningMock,
  makeMirrorMock as makeGlobalMirrorMock,
} from '../../../../../core/shared/__tests__/helpers/mocks';
import {
  mockAccountData,
  mockTransactionResults,
  mockMirrorAccountData,
  mockAliasLists,
  OPERATOR_SUFFICIENT_BALANCE,
  OPERATOR_ACCOUNT_ID,
  OPERATOR_KEY_REF_ID,
} from './fixtures';

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
 * Creates an AccountData object with default values and optional overrides
 */
export const makeAccountData = (
  overrides: Partial<AccountData> = {},
): AccountData => ({
  ...mockAccountData.default,
  ...overrides,
});

/**
 * Creates mock HederaMirrornodeService methods for testing account balances
 */
export const makeMirrorMocks = ({
  hbarBalance = 0n,
  tokenBalances,
  tokenError,
}: {
  hbarBalance?: bigint;
  tokenBalances?: { token_id: string; balance: number }[];
  tokenError?: Error;
}): Partial<HederaMirrornodeService> => {
  return {
    getAccountHBarBalance: jest.fn().mockResolvedValue(hbarBalance),
    getAccountTokenBalances: tokenError
      ? jest.fn().mockRejectedValue(tokenError)
      : jest.fn().mockResolvedValue({ tokens: tokenBalances ?? [] }),
  };
};

/**
 * Creates mock AccountTransactionService
 */
export const makeAccountTransactionServiceMock = (
  overrides?: Partial<jest.Mocked<AccountService>>,
): jest.Mocked<AccountService> => ({
  createAccount: jest.fn(),
  getAccountInfo: jest.fn(),
  getAccountBalance: jest.fn(),
  ...overrides,
});

/**
 * Creates mock TxExecutionService
 */
export const makeTxExecutionServiceMock = (
  overrides?: Partial<jest.Mocked<TxExecutionService>>,
): jest.Mocked<TxExecutionService> => ({
  signAndExecute: jest.fn().mockResolvedValue(mockTransactionResults.success),
  signAndExecuteWith: jest
    .fn()
    .mockResolvedValue(mockTransactionResults.success),
  freezeTx: jest.fn().mockImplementation((transaction) => transaction),
  ...overrides,
});

/**
 * Creates mock NetworkService
 */
export const makeNetworkServiceMock = (
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
 * Creates mock HederaMirrornodeService with getAccount method
 */
export const makeMirrorNodeMock = (
  overrides?: Partial<jest.Mocked<HederaMirrornodeService>>,
): Partial<HederaMirrornodeService> => ({
  getAccount: jest.fn().mockResolvedValue(mockMirrorAccountData.default),
  ...overrides,
});

/**
 * Creates mock ZustandAccountStateHelper methods
 */
export const makeAccountStateHelperMock = (overrides?: {
  loadAccount?: jest.Mock;
  saveAccount?: jest.Mock;
  deleteAccount?: jest.Mock;
  listAccounts?: jest.Mock;
  clearAccounts?: jest.Mock;
  hasAccount?: jest.Mock;
}) => ({
  loadAccount: jest.fn(),
  saveAccount: jest.fn(),
  deleteAccount: jest.fn(),
  listAccounts: jest.fn().mockReturnValue([]),
  clearAccounts: jest.fn(),
  hasAccount: jest.fn().mockReturnValue(false),
  ...overrides,
});

/**
 * Creates mock AliasService
 * By default, returns an empty list and supports filtering by network and type
 */
export const makeAliasServiceMock = (options?: {
  records?: any[];
}): jest.Mocked<AliasService> => {
  const records = options?.records ?? mockAliasLists.empty;

  return {
    exists: jest.fn().mockReturnValue(false),
    availableOrThrow: jest.fn().mockReturnValue(null),
    register: jest.fn(),
    resolve: jest.fn().mockReturnValue(null),
    list: jest
      .fn()
      .mockImplementation((filter?: { network?: string; type?: string }) => {
        return records.filter((r: any) => {
          if (filter?.network && r.network !== filter.network) return false;
          if (filter?.type && r.type !== filter.type) return false;
          return true;
        });
      }),
    remove: jest.fn(),
  };
};

/**
 * Creates CommandHandlerArgs for testing command handlers
 */
export const makeArgs = (
  api: Partial<CoreApi>,
  logger: jest.Mocked<Logger>,
  args: Record<string, unknown>,
): CommandHandlerArgs => ({
  api: {
    pluginManagement: {
      listPlugins: jest.fn().mockReturnValue([]),
      getPlugin: jest.fn(),
      addPlugin: jest.fn(),
      removePlugin: jest.fn(),
      enablePlugin: jest.fn(),
      disablePlugin: jest.fn(),
      savePluginState: jest.fn(),
    } as PluginManagementService,
    ...api,
  } as CoreApi,
  logger,
  state: {} as any,
  config: {} as any,
  args,
});

/**
 * Configuration options for makeApiMocksForAccountCreate
 */
export interface ApiMocksConfig {
  createAccountImpl?: jest.Mock;
  signAndExecuteImpl?: jest.Mock;
  network?: 'testnet' | 'mainnet' | 'previewnet';
  operatorBalance?: bigint;
}

/**
 * Factory function to create consistent API mocks for account creation tests
 * Follows Web3 testing best practices:
 * - Centralizes mock configuration
 * - Uses realistic balance values
 * - Provides sensible defaults
 * - Ensures all required dependencies are mocked
 */
export const makeApiMocksForAccountCreate = ({
  createAccountImpl,
  signAndExecuteImpl,
  network = 'testnet',
  operatorBalance = OPERATOR_SUFFICIENT_BALANCE,
}: ApiMocksConfig) => {
  const account: jest.Mocked<AccountService> = {
    createAccount: createAccountImpl || jest.fn(),
    getAccountInfo: jest.fn(),
    getAccountBalance: jest.fn(),
  };

  const signing = makeGlobalSigningMock({ signAndExecuteImpl });
  const networkMock = makeGlobalNetworkMock(network);

  // Configure network mock to return a valid operator for balance checks
  networkMock.getOperator = jest.fn().mockReturnValue({
    accountId: OPERATOR_ACCOUNT_ID,
    keyRefId: OPERATOR_KEY_REF_ID,
  });

  const kms = makeGlobalKmsMock();

  // Override createLocalPrivateKey for account creation tests
  kms.createLocalPrivateKey = jest.fn().mockReturnValue({
    keyRefId: 'kr_test123',
    publicKey: 'pub-key-test',
  });

  // Configure mirror node mock with sufficient operator balance
  const mirror = makeGlobalMirrorMock({
    hbarBalance: operatorBalance,
  });

  const alias = makeGlobalAliasMock();

  return { account, signing, networkMock, kms, alias, mirror };
};
