/**
 * Shared Mock Factory Functions for Contract ERC-20 Plugin Tests
 * Provides makeApiMocks with defaults for identityResolution, contractQuery, and contract.
 */
import type { AccountService } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { ContractCompilerService } from '@/core/services/contract-compiler/contract-compiler-service.interface';
import type { ContractQueryService } from '@/core/services/contract-query/contract-query-service.interface';
import type { ContractTransactionService } from '@/core/services/contract-transaction/contract-transaction-service.interface';
import type { ContractVerifierService } from '@/core/services/contract-verifier/contract-verifier-service.interface';
import type { HbarService } from '@/core/services/hbar/hbar-service.interface';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { OutputService } from '@/core/services/output/output-service.interface';
import type { PluginManagementService } from '@/core/services/plugin-management/plugin-management-service.interface';
import type { TokenService } from '@/core/services/token/token-service.interface';
import type { TopicService } from '@/core/services/topic/topic-transaction-service.interface';
import type { TxExecutionService } from '@/core/services/tx-execution/tx-execution-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

import {
  createMirrorNodeMock,
  makeAliasMock,
  makeConfigMock,
  makeContractQueryServiceMock,
  makeIdentityResolutionServiceMock,
  makeKeyResolverMock,
  makeKmsMock,
  makeNetworkMock,
  makeSigningMock,
  makeStateMock,
} from '@/__tests__/mocks/mocks';

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
 * Configuration options for makeApiMocks (contract-erc20: identityResolution, contractQuery, contract)
 */
export interface ApiMocksConfig {
  identityResolution?: Partial<jest.Mocked<IdentityResolutionService>>;
  contractQuery?: Partial<jest.Mocked<ContractQueryService>>;
  contract?: Partial<jest.Mocked<ContractTransactionService>>;
  txExecution?: Partial<jest.Mocked<TxExecutionService>>;
  network?: SupportedNetwork;
  alias?: Partial<jest.Mocked<AliasService>>;
}

/**
 * Create a complete mocked CoreApi for contract-erc20 tests with defaults for
 * identityResolution, contractQuery, and contract. Pass overrides in config to customize.
 */
export const makeApiMocks = (config?: ApiMocksConfig) => {
  const network = makeNetworkMock(config?.network ?? 'testnet');
  const alias = {
    ...makeAliasMock(),
    ...config?.alias,
  };
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
      queryResult: [18],
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

  const txExecution = {
    ...makeSigningMock(),
    ...config?.txExecution,
  } as TxExecutionService;

  const api: jest.Mocked<CoreApi> = {
    account: {
      createAccount: jest.fn(),
      getAccountInfo: jest.fn(),
      getAccountBalance: jest.fn(),
    } as unknown as AccountService,
    token: {
      createTokenTransaction: jest.fn(),
      createTokenAssociationTransaction: jest.fn(),
      createTransferTransaction: jest.fn(),
      createMintTransaction: jest.fn(),
      createNftTransferTransaction: jest.fn(),
    } as unknown as TokenService,
    topic: {} as unknown as TopicService,
    txExecution,
    kms,
    alias,
    state: makeStateMock(),
    mirror: mirror as unknown as HederaMirrornodeService,
    network,
    config: makeConfigMock() as unknown as ConfigService,
    logger: makeLogger(),
    hbar: {
      transferTinybar: jest.fn(),
    } as jest.Mocked<HbarService>,
    output: {
      handleCommandOutput: jest.fn(),
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
      savePluginState: jest.fn(),
    } as PluginManagementService,
    contract,
    contractCompiler: {
      compileContract: jest.fn(),
    } as unknown as ContractCompilerService,
    contractVerifier: {
      verifyContract: jest.fn(),
    } as unknown as ContractVerifierService,
    contractQuery,
    identityResolution,
    keyResolver,
  };

  return {
    api,
    identityResolution,
    contractQuery,
    contract,
  };
};
