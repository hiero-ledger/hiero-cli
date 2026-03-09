import type { Logger } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { ContractData } from '@/plugins/contract/schema';

import {
  MOCK_ACCOUNT_ID,
  MOCK_CONTRACT_ID,
  MOCK_EVM_ADDRESS,
  MOCK_TX_ID,
} from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError } from '@/core';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  makeAliasServiceMock,
  makeArgs,
  makeLogger,
} from '@/plugins/account/__tests__/unit/helpers/mocks';
import { DeleteContractOutputSchema } from '@/plugins/contract/commands/delete';
import { deleteContract } from '@/plugins/contract/commands/delete/handler';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandContractStateHelper: jest.fn(),
}));

const MockedHelper = ZustandContractStateHelper as jest.Mock;

function makeContractData(overrides: Partial<ContractData> = {}): ContractData {
  return {
    contractId: MOCK_CONTRACT_ID,
    contractName: 'MyContract',
    contractEvmAddress: MOCK_EVM_ADDRESS,
    network: SupportedNetwork.TESTNET,
    ...overrides,
  };
}

describe('contract plugin - delete command', () => {
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
      txExecute: {
        executeBytes: jest.fn().mockResolvedValue({
          success: true,
          transactionId: MOCK_TX_ID,
        }),
      },
    }).api;
  });

  test('deletes contract successfully by contract ID', async () => {
    const contract = makeContractData({
      contractId: MOCK_CONTRACT_ID,
      contractName: 'MyContract',
    });
    const alias = makeAliasServiceMock();

    const deleteContractMock = jest.fn().mockReturnValue(undefined);
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      deleteContract: deleteContractMock,
    }));

    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
    });

    const result = await deleteContract(args);

    expect(deleteContractMock).toHaveBeenCalledWith(MOCK_CONTRACT_ID);
    const output = assertOutput(result.result, DeleteContractOutputSchema);
    expect(output.deletedContract.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.deletedContract.contractName).toBe('MyContract');
  });

  test('deletes contract successfully by alias', async () => {
    const contract = makeContractData({
      contractId: MOCK_CONTRACT_ID,
      alias: 'my-contract',
      contractName: 'ImportedContract',
    });

    const deleteContractMock = jest.fn().mockReturnValue(undefined);
    const alias = makeAliasServiceMock();
    alias.resolve.mockReturnValue({
      alias: 'my-contract',
      type: AliasType.Contract,
      network: SupportedNetwork.TESTNET,
      entityId: MOCK_CONTRACT_ID,
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      deleteContract: deleteContractMock,
    }));

    const args = makeArgs(
      {
        ...api,
        alias,
      },
      logger,
      {
        contract: 'my-contract',
      },
    );

    const result = await deleteContract(args);

    expect(alias.resolve).toHaveBeenCalledWith(
      'my-contract',
      AliasType.Contract,
      SupportedNetwork.TESTNET,
    );
    expect(deleteContractMock).toHaveBeenCalledWith(MOCK_CONTRACT_ID);
    expect(alias.remove).toHaveBeenCalledWith(
      'my-contract',
      SupportedNetwork.TESTNET,
    );
    const output = assertOutput(result.result, DeleteContractOutputSchema);
    expect(output.deletedContract.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.deletedContract.contractName).toBe('ImportedContract');
  });

  test('throws when contract param is missing', async () => {
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn(),
      deleteContract: jest.fn(),
    }));

    const args = makeArgs(api, logger, {});

    await expect(deleteContract(args)).rejects.toThrow();
  });

  test('throws when contract with given ID not found', async () => {
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(undefined),
      deleteContract: jest.fn(),
    }));
    const args = makeArgs(api, logger, { contract: '0.0.9999' });

    await expect(deleteContract(args)).rejects.toThrow(
      "Contract with identifier '0.0.9999' not found",
    );
  });

  test('throws when contract with given alias not found', async () => {
    const alias = makeAliasServiceMock();
    alias.resolve.mockReturnValue(null);

    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn(),
      deleteContract: jest.fn(),
    }));

    const args = makeArgs({ ...api, alias }, logger, {
      contract: 'missing-alias',
    });

    await expect(deleteContract(args)).rejects.toThrow(
      "Contract with alias 'missing-alias' not found",
    );
  });

  test('throws when alias resolves but contract not in state', async () => {
    const alias = makeAliasServiceMock();
    alias.resolve.mockReturnValue({
      alias: 'my-contract',
      type: AliasType.Contract,
      network: SupportedNetwork.TESTNET,
      entityId: MOCK_CONTRACT_ID,
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(undefined),
      deleteContract: jest.fn(),
    }));

    const args = makeArgs({ ...api, alias }, logger, {
      contract: 'my-contract',
    });

    await expect(deleteContract(args)).rejects.toThrow(
      "Contract with identifier 'my-contract' not found",
    );
  });

  test('throws when deleteContract throws', async () => {
    const contract = makeContractData({ contractId: MOCK_CONTRACT_ID });
    const alias = makeAliasServiceMock();
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      deleteContract: jest.fn().mockImplementation(() => {
        throw new InternalError('db error');
      }),
    }));
    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
    });

    await expect(deleteContract(args)).rejects.toThrow('db error');
  });
});
