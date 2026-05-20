import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';

import { MOCK_EVM_ADDRESS } from '@/__tests__/mocks/fixtures';
import { makeLogger, makeStateMock } from '@/__tests__/mocks/mocks';
import { SupportedNetwork } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { CONTRACT_NAMESPACE } from '@/plugins/contract/constants';
import { ContractStateServiceImpl } from '@/plugins/contract/services/contract-state.service';

const MOCK_CONTRACT_ID = '0.0.1234';
const MOCK_KEY = composeKey(SupportedNetwork.TESTNET, MOCK_CONTRACT_ID);

function makeContractData() {
  return {
    contractId: MOCK_CONTRACT_ID,
    contractEvmAddress: MOCK_EVM_ADDRESS,
    adminKeyRefIds: [],
    adminKeyThreshold: 0,
    network: SupportedNetwork.TESTNET,
  };
}

describe('ContractStateServiceImpl', () => {
  let state: jest.Mocked<StateService>;
  let logger: jest.Mocked<Logger>;
  let service: ContractStateServiceImpl;

  beforeEach(() => {
    state = makeStateMock();
    logger = makeLogger();
    service = new ContractStateServiceImpl(state, logger);
  });

  describe('hasContract', () => {
    test('delegates to state.has with CONTRACT_NAMESPACE', () => {
      (state.has as jest.Mock).mockReturnValue(true);

      const result = service.hasContract(MOCK_KEY);

      expect(state.has).toHaveBeenCalledWith(CONTRACT_NAMESPACE, MOCK_KEY);
      expect(result).toBe(true);
    });

    test('returns false when contract does not exist', () => {
      (state.has as jest.Mock).mockReturnValue(false);

      const result = service.hasContract(MOCK_KEY);

      expect(result).toBe(false);
    });
  });

  describe('getContract', () => {
    test('delegates to state.get with CONTRACT_NAMESPACE', () => {
      const contract = makeContractData();
      (state.get as jest.Mock).mockReturnValue(contract);

      const result = service.getContract(MOCK_KEY);

      expect(state.get).toHaveBeenCalledWith(CONTRACT_NAMESPACE, MOCK_KEY);
      expect(result).toEqual(contract);
    });

    test('returns undefined when contract does not exist', () => {
      (state.get as jest.Mock).mockReturnValue(undefined);

      const result = service.getContract(MOCK_KEY);

      expect(result).toBeUndefined();
    });
  });

  describe('saveContract', () => {
    test('delegates to state.set with CONTRACT_NAMESPACE', () => {
      const contract = makeContractData();

      service.saveContract(MOCK_KEY, contract);

      expect(state.set).toHaveBeenCalledWith(
        CONTRACT_NAMESPACE,
        MOCK_KEY,
        contract,
      );
    });
  });

  describe('deleteContract', () => {
    test('delegates to state.delete with CONTRACT_NAMESPACE', () => {
      service.deleteContract(MOCK_KEY);

      expect(state.delete).toHaveBeenCalledWith(CONTRACT_NAMESPACE, MOCK_KEY);
    });

    test('logs debug message before deleting', () => {
      service.deleteContract(MOCK_KEY);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(MOCK_KEY),
      );
    });
  });

  describe('listContracts', () => {
    test('returns all valid contracts from state', () => {
      const contracts = [
        makeContractData(),
        { ...makeContractData(), contractId: '0.0.5678' },
      ];
      (state.list as jest.Mock).mockReturnValue(contracts);

      const result = service.listContracts();

      expect(state.list).toHaveBeenCalledWith(CONTRACT_NAMESPACE);
      expect(result).toHaveLength(2);
    });

    test('filters out entries with missing contractId', () => {
      const valid = makeContractData();
      const invalid = {
        contractEvmAddress: '0x123',
        network: SupportedNetwork.TESTNET,
      };
      (state.list as jest.Mock).mockReturnValue([valid, invalid, null]);

      const result = service.listContracts();

      expect(result).toHaveLength(1);
      expect(result[0].contractId).toBe(MOCK_CONTRACT_ID);
    });

    test('returns empty array when no contracts in state', () => {
      (state.list as jest.Mock).mockReturnValue([]);

      const result = service.listContracts();

      expect(result).toEqual([]);
    });
  });
});
