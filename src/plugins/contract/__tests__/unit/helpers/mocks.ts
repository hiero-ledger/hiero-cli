import type { AccountService } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { AllowanceService } from '@/core/services/allowance/allowance-service.interface';
import type { BatchTransactionService } from '@/core/services/batch/batch-transaction-service.interface';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { ContractCompilerService } from '@/core/services/contract-compiler/contract-compiler-service.interface';
import type { ContractQueryService } from '@/core/services/contract-query/contract-query-service.interface';
import type { ContractTransactionService } from '@/core/services/contract-transaction/contract-transaction-service.interface';
import type { ContractVerifierService } from '@/core/services/contract-verifier/contract-verifier-service.interface';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { OutputService } from '@/core/services/output/output-service.interface';
import type { OutputHandlerOptions } from '@/core/services/output/types';
import type { PluginManagementService } from '@/core/services/plugin-management/plugin-management-service.interface';
import type { ReceiptService } from '@/core/services/receipt/receipt-service.interface';
import type { TokenService } from '@/core/services/token/token-service.interface';
import type { TopicService } from '@/core/services/topic/topic-transaction-service.interface';
import type { TransferService } from '@/core/services/transfer/transfer-service.interface';
import type { TxExecuteService } from '@/core/services/tx-execute/tx-execute-service.interface';
import type { TxSignService } from '@/core/services/tx-sign/tx-sign-service.interface';

import { MOCK_CONTRACT_ID } from '@/__tests__/mocks/fixtures';
import {
  createMirrorNodeMock,
  makeAliasMock,
  makeConfigMock,
  makeContractQueryServiceMock,
  makeIdentityResolutionServiceMock,
  makeKeyResolverMock,
  makeKmsMock,
  makeNetworkMock,
  makeScheduleTransactionServiceMock,
  makeStateMock,
  makeTxExecuteMock,
  makeTxSignMock,
} from '@/__tests__/mocks/mocks';
import {
  EntityReferenceType,
  SupportedNetwork,
} from '@/core/types/shared.types';
import { CONTRACT_NAME_REGEX } from '@/plugins/contract/utils/contract-file-helpers';

import {
  MOCK_COMPILATION_RESULT,
  MOCK_CONTRACT_CREATE_FLOW_RESULT,
  MOCK_ERC20_PATH,
  MOCK_ERC721_PATH,
  MOCK_REPO_BASE_PATH,
  SAMPLE_ERC20_SOL_CONTENT,
  SAMPLE_ERC721_SOL_CONTENT,
} from './fixtures';

export const mockGetDefaultContractFilePath = jest.fn();
export const mockGetRepositoryBasePath = jest.fn();
export const mockReadContractFile = jest.fn();
export const mockReadContractNameFromFileContent = jest.fn();

export function setupContractFileMocks(): void {
  mockGetDefaultContractFilePath.mockImplementation((template: string) =>
    template === 'erc20' ? MOCK_ERC20_PATH : MOCK_ERC721_PATH,
  );
  mockGetRepositoryBasePath.mockReturnValue(MOCK_REPO_BASE_PATH);
  mockReadContractFile.mockImplementation((path: string) => {
    if (path.includes('erc20')) return SAMPLE_ERC20_SOL_CONTENT;
    return SAMPLE_ERC721_SOL_CONTENT;
  });
  mockReadContractNameFromFileContent.mockImplementation(
    (_basename: string, content: string) => {
      const match = content.match(CONTRACT_NAME_REGEX);
      return match ? match[1] : 'Unknown';
    },
  );
}

export const MOCK_RESOLVE_ACCOUNT_RESULT = {
  accountId: '0.0.999',
  accountPublicKey: 'mock-public-key',
  evmAddress: '0xmockevmaddress',
};

export interface ApiMocksConfig {
  identityResolution?: Partial<jest.Mocked<IdentityResolutionService>>;
  contractQuery?: Partial<jest.Mocked<ContractQueryService>>;
  contract?: Partial<jest.Mocked<ContractTransactionService>>;
  txSign?: Partial<jest.Mocked<TxSignService>>;
  txExecute?: Partial<jest.Mocked<TxExecuteService>>;
  network?: SupportedNetwork;
  alias?: Partial<jest.Mocked<AliasService>>;
}

export const makeApiMocks = (config?: ApiMocksConfig) => {
  const network = makeNetworkMock(config?.network ?? SupportedNetwork.TESTNET);
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
      .mockReturnValue({ entityIdOrEvmAddress: MOCK_CONTRACT_ID }),
  };
  const identityResolution = {
    ...defaultIdentityResolution,
    ...config?.identityResolution,
  } as jest.Mocked<IdentityResolutionService>;

  const defaultContractQuery = {
    ...makeContractQueryServiceMock(),
    queryContractFunction: jest.fn().mockResolvedValue({
      contractId: MOCK_CONTRACT_ID,
      queryResult: [18],
    }),
  };
  const contractQuery = {
    ...defaultContractQuery,
    ...config?.contractQuery,
  } as jest.Mocked<ContractQueryService>;

  const defaultContract = {
    contractCreateFlowTransaction: jest.fn(),
    contractExecuteTransaction: jest.fn(),
    contractExecuteWithEncodedParams: jest.fn(),
    deleteContract: jest.fn(),
    updateContract: jest.fn(),
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
      createTransferTransaction: jest.fn(),
      createMintTransaction: jest.fn(),
      createNftTransferTransaction: jest.fn(),
    } as unknown as TokenService,
    batch: {
      createBatchTransaction: jest.fn(),
    } as unknown as BatchTransactionService,
    receipt: {
      getReceipt: jest.fn(),
    } as unknown as ReceiptService,
    topic: {} as unknown as TopicService,
    transfer: {
      buildTransferTransaction: jest.fn(),
    } as unknown as TransferService,
    allowance: {
      buildAllowanceApprove: jest.fn(),
      buildNftAllowanceDelete: jest.fn(),
    } as unknown as AllowanceService,
    txSign,
    txExecute,
    kms,
    alias,
    state: makeStateMock(),
    mirror: mirror as unknown as HederaMirrornodeService,
    network,
    config: makeConfigMock() as unknown as ConfigService,
    logger: makeLogger(),
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
    contract,
    contractCompiler: {
      compileContract: jest.fn(),
    } as unknown as ContractCompilerService,
    contractVerifier: {
      verifyContract: jest.fn(),
      isVerifiedFullMatchOnRepository: jest.fn().mockResolvedValue(false),
    } as unknown as ContractVerifierService,
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

export function makeContractCreateApiMocks(): { api: jest.Mocked<CoreApi> } {
  const { api } = makeApiMocks({
    txSign: {
      signContractCreateFlow: jest.fn().mockImplementation((flow) => flow),
    },
    txExecute: {
      executeContractCreateFlow: jest
        .fn()
        .mockResolvedValue(MOCK_CONTRACT_CREATE_FLOW_RESULT),
    },
    contract: {
      contractCreateFlowTransaction: jest.fn().mockReturnValue({
        transaction: {},
      }),
    },
  });

  (
    api.contractCompiler as unknown as { compileContract: jest.Mock }
  ).compileContract = jest.fn().mockResolvedValue(MOCK_COMPILATION_RESULT);
  (
    api.contractVerifier as unknown as { verifyContract: jest.Mock }
  ).verifyContract = jest.fn().mockResolvedValue({ success: true });
  (
    api.identityResolution as unknown as { resolveAccount: jest.Mock }
  ).resolveAccount = jest.fn().mockResolvedValue(MOCK_RESOLVE_ACCOUNT_RESULT);

  return { api };
}

export const makeLogger = (): jest.Mocked<Logger> => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  setLevel: jest.fn(),
});

export { EntityReferenceType };
