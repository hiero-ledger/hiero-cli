/**
 * Shared Mock Factory Functions for Account Plugin Tests
 * Provides reusable mocks for services, APIs, and common test utilities
 */
import type { AccountService } from '@/core/services/account/account-transaction-service.interface';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { TxExecuteService } from '@/core/services/tx-execute/tx-execute-service.interface';
import type { TxSignService } from '@/core/services/tx-sign/tx-sign-service.interface';
import type { AccountData } from '@/plugins/account/schema';

import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import {
  makeAliasMock as makeGlobalAliasMock,
  makeIdentityResolutionServiceMock,
  makeKeyResolverMock,
  makeKmsMock as makeGlobalKmsMock,
  makeMirrorMock as makeGlobalMirrorMock,
  makeNetworkMock as makeGlobalNetworkMock,
  makeTxExecuteMock,
  makeTxSignMock,
} from '@/__tests__/mocks/mocks';

import {
  mockAccountData,
  mockAliasLists,
  mockMirrorAccountData,
  mockTransactionResults,
  OPERATOR_ACCOUNT_ID,
  OPERATOR_KEY_REF_ID,
  OPERATOR_SUFFICIENT_BALANCE,
} from './fixtures';

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
  tokenBalances,
  tokenError,
}: {
  hbarBalance?: bigint;
  tokenBalances?: { token_id: string; balance: number }[];
  tokenError?: Error;
}): Partial<HederaMirrornodeService> => {
  return {
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
  updateAccount: jest.fn(),
  deleteAccount: jest.fn(),
  getAccountInfo: jest.fn(),
  ...overrides,
});

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
 * Creates mock HederaMirrornodeService with getAccount method
 */
export const makeMirrorNodeMock = (
  overrides?: Partial<jest.Mocked<HederaMirrornodeService>>,
): Partial<HederaMirrornodeService> => ({
  getAccountOrThrow: jest.fn().mockResolvedValue(mockMirrorAccountData.default),
  getAccount: jest.fn().mockResolvedValue(mockMirrorAccountData.default),
  ...overrides,
});

export const makeAccountStateServiceMock = (overrides?: {
  getAccount?: jest.Mock;
  saveAccount?: jest.Mock;
  deleteAccount?: jest.Mock;
  listAccounts?: jest.Mock;
  clearAccounts?: jest.Mock;
  hasAccount?: jest.Mock;
}) => ({
  getAccount: jest.fn(),
  saveAccount: jest.fn(),
  deleteAccount: jest.fn(),
  listAccounts: jest.fn().mockReturnValue([]),
  clearAccounts: jest.fn(),
  hasAccount: jest.fn().mockReturnValue(false),
  ...overrides,
});

export const makeAccountCleanupServiceMock = (overrides?: {
  removeAccountFromLocalState?: jest.Mock;
  removeKmsCredentialIfUnusedAfterAccountRemoved?: jest.Mock;
}) => ({
  removeAccountFromLocalState: jest.fn().mockReturnValue([]),
  removeKmsCredentialIfUnusedAfterAccountRemoved: jest.fn(),
  ...overrides,
});

export const makeAccountBalanceServiceMock = (overrides?: {
  fetchTokenBalances?: jest.Mock;
  fetchNftBalances?: jest.Mock;
}) => ({
  fetchTokenBalances: jest.fn().mockResolvedValue(undefined),
  fetchNftBalances: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

/**
 * Creates mock AliasService
 * By default, returns an empty list and supports filtering by network and type
 */
export const makeAliasServiceMock = (options?: {
  records?: Array<Record<string, unknown>>;
}): jest.Mocked<AliasService> => {
  const records = options?.records ?? mockAliasLists.empty;

  return {
    exists: jest.fn().mockReturnValue(false),
    availableOrThrow: jest.fn().mockReturnValue(null),
    register: jest.fn(),
    resolve: jest.fn().mockReturnValue(null),
    resolveOrThrow: jest.fn(),
    resolveByEvmAddress: jest.fn().mockReturnValue(null),
    list: jest
      .fn()
      .mockImplementation((filter?: { network?: string; type?: string }) => {
        return records.filter((r: Record<string, unknown>) => {
          if (filter?.network && r.network !== filter.network) return false;
          if (filter?.type && r.type !== filter.type) return false;
          return true;
        });
      }),
    remove: jest.fn(),
    clear: jest.fn(),
  };
};

export function mockIdentityResolution(
  entityId: string,
): jest.Mocked<IdentityResolutionService> {
  const identityResolutionService = makeIdentityResolutionServiceMock();
  identityResolutionService.resolveReferenceToEntityOrEvmAddress.mockReturnValue(
    {
      entityIdOrEvmAddress: entityId,
    },
  );
  identityResolutionService.resolveAccount.mockResolvedValue({
    accountId: entityId,
    accountPublicKey:
      '302a300506032b657003210000000000000000000000000000000000000000',
  });
  return identityResolutionService;
}

/**
 * Configuration options for makeApiMocksForAccountCreate
 */
export interface ApiMocksConfig {
  createAccountImpl?: jest.Mock;
  executeImpl?: jest.Mock;
  network?: 'testnet' | 'mainnet' | 'previewnet';
  operatorBalance?: bigint;
  keyResolverGetPublicKeyImpl?: jest.Mock;
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
  executeImpl,
  network = 'testnet',
  operatorBalance = OPERATOR_SUFFICIENT_BALANCE,
  keyResolverGetPublicKeyImpl,
}: ApiMocksConfig) => {
  const account: jest.Mocked<AccountService> = {
    createAccount: createAccountImpl || jest.fn(),
    updateAccount: jest.fn(),
    deleteAccount: jest.fn(),
    getAccountInfo: jest.fn(),
  };

  const txSign = makeTxSignMock();
  const txExecute = makeTxExecuteMock({ executeImpl: executeImpl });
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

  const keyResolver = {
    ...makeKeyResolverMock({ network: networkMock, alias, kms }),
    getPublicKey:
      keyResolverGetPublicKeyImpl ??
      jest.fn().mockResolvedValue({
        keyRefId: 'kr_provided123',
        publicKey: 'provided-pub-key',
      }),
    resolveAccountCredentials: jest.fn(),
    resolveDestination: jest.fn(),
    resolveSigningKey: jest.fn(),
  };

  return {
    account,
    txSign,
    txExecute,
    networkMock,
    kms,
    alias,
    mirror,
    keyResolver,
  };
};

export interface ApiMocksDeleteConfig {
  deleteAccountImpl?: jest.Mock;
  executeImpl?: jest.Mock;
  network?: 'testnet' | 'mainnet' | 'previewnet';
}

export const makeApiMocksForAccountDelete = ({
  deleteAccountImpl,
  executeImpl,
  network = 'testnet',
}: ApiMocksDeleteConfig) => {
  const account: jest.Mocked<AccountService> = {
    createAccount: jest.fn(),
    deleteAccount:
      deleteAccountImpl ||
      jest.fn().mockReturnValue({
        transaction: createMockTransaction(),
      }),
    updateAccount: jest.fn(),
    getAccountInfo: jest.fn(),
  };

  const txSign = makeTxSignServiceMock();
  const txExecute = makeTxExecuteMock({ executeImpl });
  const networkMock = makeGlobalNetworkMock(network);

  networkMock.getOperator = jest.fn().mockReturnValue({
    accountId: OPERATOR_ACCOUNT_ID,
    keyRefId: OPERATOR_KEY_REF_ID,
  });

  const kms = makeGlobalKmsMock();
  const alias = makeGlobalAliasMock();

  const keyResolver = {
    ...makeKeyResolverMock({ network: networkMock, alias, kms }),
    resolveAccountCredentials: jest.fn().mockResolvedValue({
      keyRefId: 'kr_deleted',
      accountId: '0.0.1111',
      publicKey:
        '302a300506032b657003210000000000000000000000000000000000000000',
    }),
    resolveDestination: jest.fn(),
    getPublicKey: jest.fn(),
    resolveSigningKey: jest.fn(),
  };

  return {
    account,
    txSign,
    txExecute,
    networkMock,
    kms,
    alias,
    keyResolver,
  };
};
