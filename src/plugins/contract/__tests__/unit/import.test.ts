import type { Logger } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { ImportContractOutput } from '@/plugins/contract/commands/import';

import '@/core/utils/json-serialize';

import {
  MOCK_ACCOUNT_ID,
  MOCK_CONTRACT_ID,
  MOCK_EVM_ADDRESS,
  MOCK_TX_ID,
} from '@/__tests__/mocks/fixtures';
import {
  createMirrorNodeMock,
  createMockContractInfo,
  makeArgs,
  makeLogger,
} from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { importContract } from '@/plugins/contract/commands/import/handler';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';

jest.mock('@/plugins/contract/zustand-state-helper', () => ({
  ZustandContractStateHelper: jest.fn(),
}));

const MockedHelper = ZustandContractStateHelper as jest.Mock;

describe('contract plugin - import command', () => {
  let api: jest.Mocked<CoreApi>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    api = makeApiMocks({
      identityResolution: {
        resolveContract: jest.fn().mockResolvedValue({
          contractId: MOCK_CONTRACT_ID,
          evmAddress: MOCK_EVM_ADDRESS,
        }),
        resolveAccount: jest.fn().mockResolvedValue({
          accountId: MOCK_ACCOUNT_ID,
          accountPublicKey: 'pub-key',
          evmAddress: MOCK_EVM_ADDRESS,
        }),
        resolveReferenceToEntityOrEvmAddress: jest.fn(),
      },
      contract: {
        contractExecuteTransaction: jest.fn().mockReturnValue({
          transaction: {},
        }),
      },
      txExecution: {
        signAndExecute: jest.fn().mockResolvedValue({
          success: true,
          transactionId: MOCK_TX_ID,
        }),
      },
    }).api;
  });

  test('imports contract successfully by contract ID', async () => {
    const saveContractMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      hasContract: jest.fn().mockReturnValue(false),
      saveContract: saveContractMock,
    }));

    const mockContractInfo = createMockContractInfo();
    const mirrorMock = createMirrorNodeMock();
    mirrorMock.getContractInfo.mockResolvedValue(mockContractInfo);

    const args = makeArgs(
      {
        ...api,
        mirror: mirrorMock,
      },
      logger,
      {
        contract: MOCK_CONTRACT_ID,
        name: 'ImportedContract',
        alias: 'imported-contract',
        verified: true,
      },
    );

    const result = await importContract(args);

    expect(mirrorMock.getContractInfo).toHaveBeenCalledWith(MOCK_CONTRACT_ID);
    expect(api.alias.register).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: 'imported-contract',
        type: 'contract',
        network: 'testnet',
        entityId: MOCK_CONTRACT_ID,
        evmAddress: MOCK_EVM_ADDRESS,
      }),
    );
    expect(saveContractMock).toHaveBeenCalledWith(
      MOCK_CONTRACT_ID,
      expect.objectContaining({
        contractId: MOCK_CONTRACT_ID,
        contractName: 'ImportedContract',
        contractEvmAddress: MOCK_EVM_ADDRESS,
        network: 'testnet',
        memo: 'test contract',
      }),
    );

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ImportContractOutput = JSON.parse(result.outputJson!);
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.contractName).toBe('ImportedContract');
    expect(output.contractEvmAddress).toBe(MOCK_EVM_ADDRESS);
    expect(output.alias).toBe('imported-contract');
    expect(output.network).toBe('testnet');
    expect(output.memo).toBe('test contract');
    expect(output.verified).toBe(true);
  });

  test('imports contract successfully by EVM address', async () => {
    const saveContractMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      hasContract: jest.fn().mockReturnValue(false),
      saveContract: saveContractMock,
    }));

    const mockContractInfo = createMockContractInfo();
    const mirrorMock = createMirrorNodeMock();
    mirrorMock.getContractInfo.mockResolvedValue(mockContractInfo);

    const args = makeArgs(
      {
        ...api,
        mirror: mirrorMock,
      },
      logger,
      {
        contract: MOCK_EVM_ADDRESS,
      },
    );

    const result = await importContract(args);

    expect(mirrorMock.getContractInfo).toHaveBeenCalledWith(MOCK_EVM_ADDRESS);
    expect(api.alias.register).not.toHaveBeenCalled();
    expect(saveContractMock).toHaveBeenCalledWith(
      MOCK_CONTRACT_ID,
      expect.objectContaining({
        verified: false,
      }),
    );

    expect(result.status).toBe(Status.Success);
    const output: ImportContractOutput = JSON.parse(result.outputJson!);
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.verified).toBe(false);
  });

  test('returns failure if contract already exists', async () => {
    MockedHelper.mockImplementation(() => ({
      hasContract: jest.fn().mockReturnValue(true),
      saveContract: jest.fn(),
    }));

    const mockContractInfo = createMockContractInfo();
    const mirrorMock = createMirrorNodeMock();
    mirrorMock.getContractInfo.mockResolvedValue(mockContractInfo);

    const args = makeArgs(
      {
        ...api,
        mirror: mirrorMock,
      },
      logger,
      {
        contract: MOCK_CONTRACT_ID,
        alias: 'my-contract',
        name: 'MyContract',
      },
    );

    const result = await importContract(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain(
      `Contract with ID '${MOCK_CONTRACT_ID}' already exists in state`,
    );
  });

  test('returns failure when mirror.getContractInfo throws', async () => {
    MockedHelper.mockImplementation(() => ({
      hasContract: jest.fn().mockReturnValue(false),
      saveContract: jest.fn(),
    }));

    const mirrorMock = createMirrorNodeMock();
    mirrorMock.getContractInfo.mockRejectedValue(new Error('mirror down'));

    const args = makeArgs(
      {
        ...api,
        mirror: mirrorMock,
      },
      logger,
      {
        contract: MOCK_CONTRACT_ID,
      },
    );

    const result = await importContract(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('mirror down');
  });
});
