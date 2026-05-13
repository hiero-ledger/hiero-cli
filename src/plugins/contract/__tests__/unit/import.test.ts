import type { Logger } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';

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
import { assertOutput } from '@/__tests__/utils/assert-output';
import { SupportedNetwork } from '@/core';
import { AliasType } from '@/core/types/shared.types';
import {
  makeApiMocks,
  makeContractStateServiceMock,
} from '@/plugins/contract/__tests__/unit/helpers/mocks';
import { ContractImportOutputSchema } from '@/plugins/contract/commands/import';
import { ImportContractCommand } from '@/plugins/contract/commands/import/handler';

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
      txExecute: {
        execute: jest.fn().mockResolvedValue({
          success: true,
          transactionId: MOCK_TX_ID,
        }),
      },
    }).api;
  });

  test('imports contract successfully by contract ID', async () => {
    const contractState = makeContractStateServiceMock({
      hasContract: jest.fn().mockReturnValue(false),
      saveContract: jest.fn(),
    });

    const mockContractInfo = createMockContractInfo();
    const mirrorMock = createMirrorNodeMock();
    mirrorMock.getContractInfo.mockResolvedValue(mockContractInfo);

    (
      api.contractVerifier.isVerifiedFullMatchOnRepository as jest.Mock
    ).mockResolvedValueOnce(true);

    const args = makeArgs(
      {
        ...api,
        mirror: mirrorMock,
      },
      logger,
      {
        contract: MOCK_CONTRACT_ID,
        name: 'imported-contract',
        verified: true,
      },
    );

    const result = await new ImportContractCommand(contractState).execute(args);

    expect(contractState.hasContract).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:${MOCK_CONTRACT_ID}`,
    );
    expect(mirrorMock.getContractInfo).toHaveBeenCalledWith(MOCK_CONTRACT_ID);
    expect(api.alias.register).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: 'imported-contract',
        type: AliasType.Contract,
        network: 'testnet',
        entityId: MOCK_CONTRACT_ID,
        evmAddress: MOCK_EVM_ADDRESS,
      }),
    );
    expect(contractState.saveContract).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:${MOCK_CONTRACT_ID}`,
      expect.objectContaining({
        contractId: MOCK_CONTRACT_ID,
        name: 'imported-contract',
        contractEvmAddress: MOCK_EVM_ADDRESS,
        adminKeyRefIds: [],
        adminKeyThreshold: 0,
        network: 'testnet',
        memo: 'test contract',
        verified: true,
      }),
    );

    const output = assertOutput(result.result, ContractImportOutputSchema);
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.contractEvmAddress).toBe(MOCK_EVM_ADDRESS);
    expect(output.name).toBe('imported-contract');
    expect(output.network).toBe('testnet');
    expect(output.memo).toBe('test contract');
    expect(output.verified).toBe(true);
  });

  test('imports contract successfully by EVM address', async () => {
    const contractState = makeContractStateServiceMock({
      hasContract: jest.fn().mockReturnValue(false),
      saveContract: jest.fn(),
    });

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

    const result = await new ImportContractCommand(contractState).execute(args);

    expect(contractState.hasContract).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:${MOCK_CONTRACT_ID}`,
    );
    expect(mirrorMock.getContractInfo).toHaveBeenCalledWith(MOCK_EVM_ADDRESS);
    expect(api.alias.register).not.toHaveBeenCalled();
    expect(contractState.saveContract).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:${MOCK_CONTRACT_ID}`,
      expect.objectContaining({
        verified: false,
      }),
    );

    const output = assertOutput(result.result, ContractImportOutputSchema);
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.verified).toBe(false);
  });

  test('throws if contract already exists', async () => {
    const contractState = makeContractStateServiceMock({
      hasContract: jest.fn().mockReturnValue(true),
    });

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
        name: 'my-contract',
      },
    );

    await expect(
      new ImportContractCommand(contractState).execute(args),
    ).rejects.toThrow(
      `Contract with ID '${MOCK_CONTRACT_ID}' already exists in state`,
    );
    expect(contractState.hasContract).toHaveBeenCalledWith(
      `${SupportedNetwork.TESTNET}:${MOCK_CONTRACT_ID}`,
    );
  });

  test('throws when mirror.getContractInfo throws', async () => {
    const contractState = makeContractStateServiceMock({
      hasContract: jest.fn().mockReturnValue(false),
    });

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

    await expect(
      new ImportContractCommand(contractState).execute(args),
    ).rejects.toThrow('mirror down');
  });
});
