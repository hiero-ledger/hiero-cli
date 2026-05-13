import type { Logger } from '@/core/services/logger/logger-service.interface';

import { MOCK_EVM_ADDRESS } from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { makeAliasServiceMock } from '@/plugins/account/__tests__/unit/helpers/mocks';
import { makeContractStateServiceMock } from '@/plugins/contract/__tests__/unit/helpers/mocks';
import { ContractCleanupServiceImpl } from '@/plugins/contract/services/contract-cleanup.service';

const MOCK_CONTRACT_ID = '0.0.1234';
const NETWORK = SupportedNetwork.TESTNET;
const STATE_KEY = composeKey(NETWORK, MOCK_CONTRACT_ID);

function makeContractData() {
  return {
    contractId: MOCK_CONTRACT_ID,
    contractEvmAddress: MOCK_EVM_ADDRESS,
    adminKeyRefIds: [],
    adminKeyThreshold: 0,
    network: NETWORK,
  };
}

describe('ContractCleanupServiceImpl', () => {
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = makeLogger();
  });

  test('deletes contract from state using composed key', () => {
    const contractState = makeContractStateServiceMock();
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    const service = new ContractCleanupServiceImpl(
      contractState,
      alias,
      logger,
    );
    const contract = makeContractData();

    service.removeContractFromLocalState(contract, NETWORK);

    expect(contractState.deleteContract).toHaveBeenCalledWith(STATE_KEY);
  });

  test('returns empty array when no aliases exist for contract', () => {
    const contractState = makeContractStateServiceMock();
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    const service = new ContractCleanupServiceImpl(
      contractState,
      alias,
      logger,
    );
    const contract = makeContractData();

    const result = service.removeContractFromLocalState(contract, NETWORK);

    expect(result).toEqual([]);
    expect(alias.remove).not.toHaveBeenCalled();
  });

  test('removes matching aliases and returns their names with network', () => {
    const contractState = makeContractStateServiceMock();
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([
      {
        alias: 'my-contract',
        type: AliasType.Contract,
        network: NETWORK,
        entityId: MOCK_CONTRACT_ID,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        alias: 'other-contract',
        type: AliasType.Contract,
        network: NETWORK,
        entityId: '0.0.9999',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    const service = new ContractCleanupServiceImpl(
      contractState,
      alias,
      logger,
    );
    const contract = makeContractData();

    const result = service.removeContractFromLocalState(contract, NETWORK);

    expect(alias.remove).toHaveBeenCalledTimes(1);
    expect(alias.remove).toHaveBeenCalledWith('my-contract', NETWORK);
    expect(result).toEqual([`my-contract (${NETWORK})`]);
  });

  test('removes multiple aliases for the same contract', () => {
    const contractState = makeContractStateServiceMock();
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([
      {
        alias: 'alias-one',
        type: AliasType.Contract,
        network: NETWORK,
        entityId: MOCK_CONTRACT_ID,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        alias: 'alias-two',
        type: AliasType.Contract,
        network: NETWORK,
        entityId: MOCK_CONTRACT_ID,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    const service = new ContractCleanupServiceImpl(
      contractState,
      alias,
      logger,
    );
    const contract = makeContractData();

    const result = service.removeContractFromLocalState(contract, NETWORK);

    expect(alias.remove).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result).toContain(`alias-one (${NETWORK})`);
    expect(result).toContain(`alias-two (${NETWORK})`);
  });

  test('logs info for each removed alias', () => {
    const contractState = makeContractStateServiceMock();
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([
      {
        alias: 'my-contract',
        type: AliasType.Contract,
        network: NETWORK,
        entityId: MOCK_CONTRACT_ID,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    const service = new ContractCleanupServiceImpl(
      contractState,
      alias,
      logger,
    );
    const contract = makeContractData();

    service.removeContractFromLocalState(contract, NETWORK);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('my-contract'),
    );
  });

  test('still deletes contract state even when no aliases exist', () => {
    const contractState = makeContractStateServiceMock();
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    const service = new ContractCleanupServiceImpl(
      contractState,
      alias,
      logger,
    );
    const contract = makeContractData();

    service.removeContractFromLocalState(contract, NETWORK);

    expect(contractState.deleteContract).toHaveBeenCalledWith(STATE_KEY);
  });
});
