import type { Logger } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { ContractCreateOutput } from '@/plugins/contract/commands/create/output';

import { MOCK_CONTRACT_ID, MOCK_TX_ID } from '@/__tests__/mocks/fixtures';
import { EvmAddressSchema } from '@/core/schemas';
import {
  makeArgs,
  makeLogger,
} from '@/plugins/account/__tests__/unit/helpers/mocks';
import { contractCreate } from '@/plugins/contract/commands/create/handler';
import {
  DEFAULT_CONSTRUCTOR_PARAMS,
  DefaultContractTemplate,
} from '@/plugins/contract/utils/contract-file-helpers';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

import {
  MOCK_ERC20_PATH,
  MOCK_ERC721_PATH,
  MOCK_REPO_BASE_PATH,
} from './helpers/fixtures';
import {
  makeContractCreateApiMocks,
  MOCK_RESOLVE_ACCOUNT_RESULT,
  mockGetDefaultContractFilePath,
  mockGetRepositoryBasePath,
  mockReadContractFile,
  mockReadContractNameFromFileContent,
  setupContractFileMocks,
} from './helpers/mocks';

jest.mock('@/plugins/contract/zustand-state-helper', () => ({
  ZustandContractStateHelper: jest.fn(),
}));

jest.mock('@/plugins/contract/utils/contract-file-helpers', () => ({
  ...jest.requireActual('@/plugins/contract/utils/contract-file-helpers'),
  getDefaultContractFilePath: (...args: unknown[]) =>
    mockGetDefaultContractFilePath(...args),
  getRepositoryBasePath: (...args: unknown[]) =>
    mockGetRepositoryBasePath(...args),
  readContractFile: (...args: unknown[]) => mockReadContractFile(...args),
  readContractNameFromFileContent: (...args: unknown[]) =>
    mockReadContractNameFromFileContent(...args),
}));

const MockedHelper = ZustandContractStateHelper as jest.Mock;

describe('contract plugin - create command', () => {
  let api: jest.Mocked<CoreApi>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    setupContractFileMocks();
    api = makeContractCreateApiMocks().api;
  });

  describe('--default flag (erc20)', () => {
    test('creates contract with erc20 default template', async () => {
      MockedHelper.mockImplementation(() => ({
        saveContract: jest.fn(),
      }));

      const args = makeArgs(api, logger, {
        name: 'my-token',
        default: 'erc20',
      });

      const result = await contractCreate(args);

      expect(mockGetDefaultContractFilePath).toHaveBeenCalledWith(
        DefaultContractTemplate.Erc20,
      );
      expect(mockGetRepositoryBasePath).toHaveBeenCalled();
      expect(mockReadContractFile).toHaveBeenCalledWith(MOCK_ERC20_PATH);
      expect(api.contractCompiler.compileContract).toHaveBeenCalledWith(
        expect.objectContaining({
          contractName: 'ERC20',
          basePath: MOCK_REPO_BASE_PATH,
          contractFilename: MOCK_ERC20_PATH,
        }),
      );
      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          constructorParameters:
            DEFAULT_CONSTRUCTOR_PARAMS[DefaultContractTemplate.Erc20],
        }),
      );

      const output = result.result as ContractCreateOutput;
      expect(output.contractId).toBe(MOCK_CONTRACT_ID);
      expect(output.contractName).toBe('ERC20');
      expect(
        EvmAddressSchema.safeParse(output.contractEvmAddress).success,
      ).toBe(true);
      expect(output.name).toBe('my-token');
    });
  });

  describe('--default flag (erc721)', () => {
    test('creates contract with erc721 default template', async () => {
      MockedHelper.mockImplementation(() => ({
        saveContract: jest.fn(),
      }));

      const args = makeArgs(api, logger, {
        name: 'my-nft',
        default: 'erc721',
      });

      const result = await contractCreate(args);

      expect(mockGetDefaultContractFilePath).toHaveBeenCalledWith(
        DefaultContractTemplate.Erc721,
      );
      expect(mockGetRepositoryBasePath).toHaveBeenCalled();
      expect(mockReadContractFile).toHaveBeenCalledWith(MOCK_ERC721_PATH);
      expect(api.contractCompiler.compileContract).toHaveBeenCalledWith(
        expect.objectContaining({
          contractName: 'ERC721',
          basePath: MOCK_REPO_BASE_PATH,
          contractFilename: MOCK_ERC721_PATH,
        }),
      );
      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          constructorParameters:
            DEFAULT_CONSTRUCTOR_PARAMS[DefaultContractTemplate.Erc721],
        }),
      );

      const output = result.result as ContractCreateOutput;
      expect(output.contractId).toBe(MOCK_CONTRACT_ID);
      expect(output.contractName).toBe('ERC721');
      expect(output.name).toBe('my-nft');
    });
  });

  describe('default constructor parameters', () => {
    test('uses default erc20 constructor params when none provided', async () => {
      MockedHelper.mockImplementation(() => ({
        saveContract: jest.fn(),
      }));

      const args = makeArgs(api, logger, {
        name: 'ft',
        default: 'erc20',
      });

      await contractCreate(args);

      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          constructorParameters:
            DEFAULT_CONSTRUCTOR_PARAMS[DefaultContractTemplate.Erc20],
        }),
      );
    });

    test('uses default erc721 constructor params when none provided', async () => {
      MockedHelper.mockImplementation(() => ({
        saveContract: jest.fn(),
      }));

      const args = makeArgs(api, logger, {
        name: 'nft',
        default: 'erc721',
      });

      await contractCreate(args);

      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          constructorParameters:
            DEFAULT_CONSTRUCTOR_PARAMS[DefaultContractTemplate.Erc721],
        }),
      );
    });

    test('uses custom constructor params when provided (overrides defaults)', async () => {
      MockedHelper.mockImplementation(() => ({
        saveContract: jest.fn(),
      }));

      const customParams = ['CustomToken', 'CTK', '5000000'];
      const args = makeArgs(api, logger, {
        name: 'custom-token',
        default: 'erc20',
        constructorParameter: customParams,
      });

      await contractCreate(args);

      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          constructorParameters: customParams,
        }),
      );
    });
  });

  describe('path resolution', () => {
    test('resolves erc20 path via getDefaultContractFilePath', async () => {
      MockedHelper.mockImplementation(() => ({
        saveContract: jest.fn(),
      }));

      mockGetDefaultContractFilePath.mockReturnValue(MOCK_ERC20_PATH);

      const args = makeArgs(api, logger, {
        name: 'token',
        default: 'erc20',
      });

      await contractCreate(args);

      expect(mockGetDefaultContractFilePath).toHaveBeenCalledTimes(1);
      expect(mockGetDefaultContractFilePath).toHaveBeenCalledWith(
        DefaultContractTemplate.Erc20,
      );
      expect(mockReadContractFile).toHaveBeenCalledWith(MOCK_ERC20_PATH);
    });

    test('resolves erc721 path via getDefaultContractFilePath', async () => {
      MockedHelper.mockImplementation(() => ({
        saveContract: jest.fn(),
      }));

      mockGetDefaultContractFilePath.mockReturnValue(MOCK_ERC721_PATH);

      const args = makeArgs(api, logger, {
        name: 'nft',
        default: 'erc721',
      });

      await contractCreate(args);

      expect(mockGetDefaultContractFilePath).toHaveBeenCalledTimes(1);
      expect(mockGetDefaultContractFilePath).toHaveBeenCalledWith(
        DefaultContractTemplate.Erc721,
      );
      expect(mockReadContractFile).toHaveBeenCalledWith(MOCK_ERC721_PATH);
    });

    test('uses getRepositoryBasePath for basePath when --default is used', async () => {
      MockedHelper.mockImplementation(() => ({
        saveContract: jest.fn(),
      }));

      const args = makeArgs(api, logger, {
        name: 'token',
        default: 'erc20',
      });

      await contractCreate(args);

      expect(mockGetRepositoryBasePath).toHaveBeenCalled();
      expect(api.contractCompiler.compileContract).toHaveBeenCalledWith(
        expect.objectContaining({
          basePath: MOCK_REPO_BASE_PATH,
        }),
      );
    });
  });

  describe('create with --file', () => {
    test('creates contract from file path', async () => {
      const customPath = '/project/MyContract.sol';
      const customContent = 'Contract MyContract { }';
      mockReadContractFile.mockReturnValue(customContent);
      mockReadContractNameFromFileContent.mockReturnValue('MyContract');

      MockedHelper.mockImplementation(() => ({
        saveContract: jest.fn(),
      }));

      const args = makeArgs(api, logger, {
        name: 'custom-contract',
        file: customPath,
      });

      const result = await contractCreate(args);

      expect(mockGetDefaultContractFilePath).not.toHaveBeenCalled();
      expect(mockGetRepositoryBasePath).not.toHaveBeenCalled();
      expect(mockReadContractFile).toHaveBeenCalledWith(customPath);
      expect(api.contractCompiler.compileContract).toHaveBeenCalledWith(
        expect.objectContaining({
          contractName: 'MyContract',
          contractFilename: customPath,
        }),
      );

      const output = result.result as ContractCreateOutput;
      expect(output.contractName).toBe('MyContract');
    });
  });

  describe('error handling', () => {
    test('throws when contractCreateFlowResult has no contractId', async () => {
      api = makeContractCreateApiMocks().api;
      (
        api.txExecute.executeContractCreateFlow as jest.Mock
      ).mockResolvedValueOnce({
        success: true,
        transactionId: MOCK_TX_ID,
        contractId: undefined,
        consensusTimestamp: '2024-01-01T00:00:00.000Z',
      });

      MockedHelper.mockImplementation(() => ({
        saveContract: jest.fn(),
      }));

      const args = makeArgs(api, logger, {
        name: 'token',
        default: 'erc20',
      });

      await expect(contractCreate(args)).rejects.toThrow(
        'Transaction completed but no contractId returned',
      );
    });
  });

  describe('staking options', () => {
    test('resolves stakedAccountId alias to accountId', async () => {
      MockedHelper.mockImplementation(() => ({ saveContract: jest.fn() }));

      const args = makeArgs(api, logger, {
        name: 'my-contract',
        default: 'erc20',
        stakedAccountId: 'my-staking-account',
      });

      await contractCreate(args);

      expect(api.identityResolution.resolveAccount).toHaveBeenCalledWith(
        expect.objectContaining({ accountReference: 'my-staking-account' }),
      );
      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          stakedAccountId: MOCK_RESOLVE_ACCOUNT_RESULT.accountId,
        }),
      );
    });

    test('passes stakedNodeId to contractCreateFlowTransaction', async () => {
      MockedHelper.mockImplementation(() => ({ saveContract: jest.fn() }));

      const args = makeArgs(api, logger, {
        name: 'my-contract',
        default: 'erc20',
        stakedNodeId: 3,
      });

      await contractCreate(args);

      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ stakedNodeId: 3 }),
      );
    });

    test('throws when both stakedAccountId and stakedNodeId are provided', async () => {
      MockedHelper.mockImplementation(() => ({ saveContract: jest.fn() }));

      const args = makeArgs(api, logger, {
        name: 'my-contract',
        default: 'erc20',
        stakedAccountId: '0.0.300',
        stakedNodeId: 3,
      });

      await expect(contractCreate(args)).rejects.toThrow();
    });

    test('passes declineStakingReward to contractCreateFlowTransaction', async () => {
      MockedHelper.mockImplementation(() => ({ saveContract: jest.fn() }));

      const args = makeArgs(api, logger, {
        name: 'my-contract',
        default: 'erc20',
        declineStakingReward: true,
      });

      await contractCreate(args);

      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ declineStakingReward: true }),
      );
    });
  });

  describe('token association and auto-renew options', () => {
    test('passes maxAutomaticTokenAssociations to contractCreateFlowTransaction', async () => {
      MockedHelper.mockImplementation(() => ({ saveContract: jest.fn() }));

      const args = makeArgs(api, logger, {
        name: 'my-contract',
        default: 'erc20',
        maxAutomaticTokenAssociations: 10,
      });

      await contractCreate(args);

      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ maxAutomaticTokenAssociations: 10 }),
      );
    });

    test('passes autoRenewPeriod to contractCreateFlowTransaction', async () => {
      MockedHelper.mockImplementation(() => ({ saveContract: jest.fn() }));

      const args = makeArgs(api, logger, {
        name: 'my-contract',
        default: 'erc20',
        autoRenewPeriod: 7776000,
      });

      await contractCreate(args);

      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ autoRenewPeriod: 7776000 }),
      );
    });

    test('resolves autoRenewAccountId alias to accountId', async () => {
      MockedHelper.mockImplementation(() => ({ saveContract: jest.fn() }));

      const args = makeArgs(api, logger, {
        name: 'my-contract',
        default: 'erc20',
        autoRenewAccountId: 'my-renew-account',
      });

      await contractCreate(args);

      expect(api.identityResolution.resolveAccount).toHaveBeenCalledWith(
        expect.objectContaining({ accountReference: 'my-renew-account' }),
      );
      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          autoRenewAccountId: MOCK_RESOLVE_ACCOUNT_RESULT.accountId,
        }),
      );
    });
  });

  describe('initialBalance option', () => {
    test('converts initialBalance HBAR string to tinybars bigint', async () => {
      MockedHelper.mockImplementation(() => ({ saveContract: jest.fn() }));

      const args = makeArgs(api, logger, {
        name: 'my-contract',
        default: 'erc20',
        initialBalance: '1',
      });

      await contractCreate(args);

      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ initialBalanceRaw: BigInt(100_000_000) }),
      );
    });

    test('converts initialBalance tinybar string (t suffix) to bigint', async () => {
      MockedHelper.mockImplementation(() => ({ saveContract: jest.fn() }));

      const args = makeArgs(api, logger, {
        name: 'my-contract',
        default: 'erc20',
        initialBalance: '500t',
      });

      await contractCreate(args);

      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ initialBalanceRaw: BigInt(500) }),
      );
    });

    test('passes undefined initialBalanceRaw when initialBalance not provided', async () => {
      MockedHelper.mockImplementation(() => ({ saveContract: jest.fn() }));

      const args = makeArgs(api, logger, {
        name: 'my-contract',
        default: 'erc20',
      });

      await contractCreate(args);

      expect(api.contract.contractCreateFlowTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ initialBalanceRaw: undefined }),
      );
    });
  });
});
