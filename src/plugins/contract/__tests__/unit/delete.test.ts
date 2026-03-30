import type { Logger } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { ContractData } from '@/plugins/contract/schema';

import {
  MOCK_ACCOUNT_ID,
  MOCK_CONTRACT_ID,
  MOCK_CONTRACT_ID_UNKNOWN,
  MOCK_EVM_ADDRESS,
  MOCK_TX_ID,
} from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError, NotFoundError } from '@/core';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { SupportedNetwork } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import {
  makeAliasServiceMock,
  makeArgs,
  makeLogger,
} from '@/plugins/account/__tests__/unit/helpers/mocks';
import { DeleteContractOutputSchema } from '@/plugins/contract/commands/delete';
import { contractDelete } from '@/plugins/contract/commands/delete/handler';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandContractStateHelper: jest.fn(),
}));

const MockedHelper = ZustandContractStateHelper as jest.Mock;

const expectedStateKey = composeKey(SupportedNetwork.TESTNET, MOCK_CONTRACT_ID);

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
        deleteContract: jest.fn().mockReturnValue({ transaction: {} }),
      },
      txExecute: {
        execute: jest.fn().mockResolvedValue({
          success: true,
          transactionId: MOCK_TX_ID,
        }),
      },
    }).api;
  });

  test('deletes contract successfully by contract ID', async () => {
    const contract = makeContractData({
      contractName: 'MyContract',
    });
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    const contractDeleteMock = jest.fn().mockReturnValue(undefined);
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      deleteContract: contractDeleteMock,
    }));

    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      stateOnly: true,
    });

    const result = await contractDelete(args);

    expect(contractDeleteMock).toHaveBeenCalledWith(expectedStateKey);
    const output = assertOutput(result.result, DeleteContractOutputSchema);
    expect(output.deletedContract.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.deletedContract.contractName).toBe('MyContract');
    expect(output.stateOnly).toBe(true);
  });

  test('deletes contract on network successfully when stateOnly is false', async () => {
    const adminKeyRefId = 'test-admin-key-ref';
    const contract = makeContractData({
      contractName: 'MyContract',
      adminKeyRefId,
    });
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    const contractDeleteMock = jest.fn().mockReturnValue(undefined);
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      deleteContract: contractDeleteMock,
    }));

    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      stateOnly: false,
      transferId: MOCK_ACCOUNT_ID,
    });

    const result = await contractDelete(args);

    expect(api.contract.deleteContract).toHaveBeenCalledWith({
      contractId: MOCK_CONTRACT_ID,
      transferAccountId: MOCK_ACCOUNT_ID,
      transferContractId: undefined,
    });
    expect(api.txSign.sign).toHaveBeenCalledWith(expect.anything(), [
      adminKeyRefId,
    ]);
    expect(api.txExecute.execute).toHaveBeenCalled();

    expect(contractDeleteMock).toHaveBeenCalledWith(expectedStateKey);
    const output = assertOutput(result.result, DeleteContractOutputSchema);
    expect(output.deletedContract.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.deletedContract.contractName).toBe('MyContract');
    expect(output.stateOnly).toBe(false);
    expect(output.transactionId).toBe(MOCK_TX_ID);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.removedAliases).toEqual([]);
  });

  test('deletes contract successfully by alias', async () => {
    const contract = makeContractData({
      contractId: MOCK_CONTRACT_ID,
      alias: 'my-contract',
      contractName: 'ImportedContract',
    });

    const contractDeleteMock = jest.fn().mockReturnValue(undefined);
    const alias = makeAliasServiceMock();
    alias.resolveOrThrow.mockReturnValue({
      alias: 'my-contract',
      type: AliasType.Contract,
      network: SupportedNetwork.TESTNET,
      entityId: MOCK_CONTRACT_ID,
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    alias.list.mockReturnValue([
      {
        alias: 'my-contract',
        type: AliasType.Contract,
        network: SupportedNetwork.TESTNET,
        entityId: MOCK_CONTRACT_ID,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      deleteContract: contractDeleteMock,
    }));

    const args = makeArgs(
      {
        ...api,
        alias,
      },
      logger,
      {
        contract: 'my-contract',
        stateOnly: true,
      },
    );

    const result = await contractDelete(args);

    expect(alias.resolveOrThrow).toHaveBeenCalledWith(
      'my-contract',
      AliasType.Contract,
      SupportedNetwork.TESTNET,
    );
    expect(contractDeleteMock).toHaveBeenCalledWith(expectedStateKey);
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

    await expect(contractDelete(args)).rejects.toThrow();
  });

  test('throws when contract with given ID not found', async () => {
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(undefined),
      deleteContract: jest.fn(),
    }));
    api.mirror.getContractInfo = jest
      .fn()
      .mockRejectedValue(
        new NotFoundError(`Contract ${MOCK_CONTRACT_ID_UNKNOWN} not found`),
      );

    const args = makeArgs(api, logger, {
      contract: MOCK_CONTRACT_ID_UNKNOWN,
      transferId: MOCK_ACCOUNT_ID,
    });

    await expect(contractDelete(args)).rejects.toThrow(NotFoundError);
  });

  test('throws when contract alias not found', async () => {
    const alias = makeAliasServiceMock();
    alias.resolveOrThrow.mockImplementation(() => {
      throw new NotFoundError(
        'Alias "missing-alias" for contract on network "testnet" not found',
      );
    });

    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn(),
      deleteContract: jest.fn(),
    }));

    const args = makeArgs({ ...api, alias }, logger, {
      contract: 'missing-alias',
      transferId: MOCK_ACCOUNT_ID,
    });

    await expect(contractDelete(args)).rejects.toThrow(NotFoundError);
  });

  test('throws when alias resolves but contract not in state', async () => {
    const alias = makeAliasServiceMock();
    alias.resolveOrThrow.mockReturnValue({
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

    api.mirror.getContractInfo = jest
      .fn()
      .mockRejectedValue(
        new NotFoundError(`Contract ${MOCK_CONTRACT_ID} not found`),
      );

    const args = makeArgs({ ...api, alias }, logger, {
      contract: 'my-contract',
      transferId: MOCK_ACCOUNT_ID,
    });

    await expect(contractDelete(args)).rejects.toThrow(NotFoundError);
  });

  test('throws when contractDelete throws', async () => {
    const contract = makeContractData({ contractId: MOCK_CONTRACT_ID });
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      deleteContract: jest.fn().mockImplementation(() => {
        throw new InternalError('db error');
      }),
    }));
    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      stateOnly: true,
    });

    await expect(contractDelete(args)).rejects.toThrow('db error');
  });
});
