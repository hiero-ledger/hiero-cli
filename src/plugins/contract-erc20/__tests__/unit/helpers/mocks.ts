/**
 * Shared Mock Factory Functions for Contract ERC-20 Plugin Tests
 * Provides makeApiMocks with defaults for identityResolution, contractQuery, and contract.
 */
import type { AccountService } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { ContractQueryService } from '@/core/services/contract-query/contract-query-service.interface';
import type { ContractTransactionService } from '@/core/services/contract-transaction/contract-transaction-service.interface';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { OutputHandlerOptions } from '@/core/services/output/types';
import type { TokenService } from '@/core/services/token/token-service.interface';
import type { TopicService } from '@/core/services/topic/topic-transaction-service.interface';
import type { TxExecuteService } from '@/core/services/tx-execute/tx-execute-service.interface';
import type { TxSignService } from '@/core/services/tx-sign/tx-sign-service.interface';

import {
  createMirrorNodeMock,
  makeAliasMock,
  makeConfigMock,
  makeContractQueryServiceMock,
  makeIdentityResolutionServiceMock,
  makeKeyResolverMock,
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
  makeScheduleTransactionServiceMock,
  makeStateMock,
  makeTxExecuteMock,
  makeTxSignMock,
} from '@/__tests__/mocks/mocks';
import { SupportedNetwork } from '@/core/types/shared.types';

/**
 * Configuration options for makeApiMocks (contract-erc20: identityResolution, contractQuery, contract)
 */
export interface ApiMocksConfig {
  identityResolution?: Partial<jest.Mocked<IdentityResolutionService>>;
  contractQuery?: Partial<jest.Mocked<ContractQueryService>>;
  contract?: Partial<jest.Mocked<ContractTransactionService>>;
  txSign?: Partial<jest.Mocked<TxSignService>>;
  txExecute?: Partial<jest.Mocked<TxExecuteService>>;
  network?: SupportedNetwork;
}

/**
 * Create a complete mocked CoreApi for contract-erc20 tests with defaults for
 * identityResolution, contractQuery, and contract. Pass overrides in config to customize.
 */
export const makeApiMocks = (config?: ApiMocksConfig) => {
  const network = makeNetworkMock(config?.network ?? SupportedNetwork.TESTNET);
  const alias = makeAliasMock();
  const kms = makeKmsMock();
  const mirror = createMirrorNodeMock();
  const keyResolver = makeKeyResolverMock({ network, alias, kms });

  const defaultIdentityResolution = {
    ...makeIdentityResolutionServiceMock(),
    resolveReferenceToEntityOrEvmAddress: jest
      .fn()
      .mockReturnValue({ entityIdOrEvmAddress: '0.0.1234' }),
  };
  const identityResolution = {
    ...defaultIdentityResolution,
    ...config?.identityResolution,
  } as jest.Mocked<IdentityResolutionService>;

  const defaultContractQuery = {
    ...makeContractQueryServiceMock(),
    queryContractFunction: jest.fn().mockResolvedValue({
      contractId: '0.0.1234',
      queryResult: [18n],
    }),
  };
  const contractQuery = {
    ...defaultContractQuery,
    ...config?.contractQuery,
  } as jest.Mocked<ContractQueryService>;

  const defaultContract = {
    contractCreateFlowTransaction: jest.fn(),
  };
  const contract = {
    ...defaultContract,
    ...config?.contract,
  } as ContractTransactionService;

  const txSign = { ...makeTxSignMock(), ...config?.txSign } as TxSignService;
  const txExecute = {
    ...makeTxExecuteMock(),
    ...config?.txExecute,
  } as TxExecuteService;

  const api: jest.Mocked<CoreApi> = {
    account: {
      createAccount: jest.fn(),
      getAccountInfo: jest.fn(),
      getAccountBalance: jest.fn(),
    } as unknown as AccountService,
    token: {
      createTokenTransaction: jest.fn(),
      createTokenAssociationTransaction: jest.fn(),
      createTokenDissociationTransaction: jest.fn(),
      createMintTransaction: jest.fn(),
    } as unknown as TokenService,
    batch: {
      createBatchTransaction: jest.fn(),
    },
    receipt: {
      getReceipt: jest.fn(),
    },
    topic: {} as unknown as TopicService,
    txSign,
    txExecute,
    kms,
    alias,
    state: makeStateMock(),
    mirror: mirror,
    network,
    config: makeConfigMock(),
    logger: makeLogger(),
    transfer: {
      buildTransferTransaction: jest.fn(),
    },
    allowance: {
      buildAllowanceApprove: jest.fn(),
      buildNftAllowanceDelete: jest.fn(),
    },
    output: {
      handleOutput: jest.fn<never, [OutputHandlerOptions]>(),
      getFormat: jest.fn().mockReturnValue('human'),
      setFormat: jest.fn(),
      emptyLine: jest.fn(),
    },
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
    },
    contract,
    contractCompiler: {
      compileContract: jest.fn(),
    },
    contractVerifier: {
      verifyContract: jest.fn(),
      isVerifiedFullMatchOnRepository: jest.fn().mockResolvedValue(false),
    },
    contractQuery,
    identityResolution,
    schedule: makeScheduleTransactionServiceMock(),
    keyResolver,
  };

  return {
    api,
    identityResolution,
    contractQuery,
    contract,
  };
};
