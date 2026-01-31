/**
 * Unit tests for ContractTransactionServiceImpl
 * Tests contract creation flow transaction construction
 */
import type { ContractFunctionParameters } from '@hashgraph/sdk';
import type {
  ContractCreateFlowParams,
  ContractExecuteParams,
} from '@/core/services/contract-transaction/types';

import {
  ContractCreateFlow,
  ContractExecuteTransaction,
  ContractId,
  PrivateKey,
} from '@hashgraph/sdk';
import { ethers, getBytes } from 'ethers';

import { ContractTransactionServiceImpl } from '@/core/services/contract-transaction/contract-transaction-service';

import {
  createMockContractCreateFlow,
  createMockContractExecuteTransaction,
} from './mocks';

const mockContractCreateFlow = createMockContractCreateFlow();
const mockContractExecuteTx = createMockContractExecuteTransaction();
const mockAdminKey = PrivateKey.generateED25519(); // Use a real key for simplicity in tests, or mock if strictly needed. Real key is easier here.

// Mock ethers
const mockEncodeDeploy = jest.fn().mockReturnValue('0x1234');
const mockInterfaceInstance = {
  encodeDeploy: mockEncodeDeploy,
};

jest.mock('@hashgraph/sdk', () => ({
  ContractCreateFlow: jest.fn(() => mockContractCreateFlow),
  ContractExecuteTransaction: jest.fn(() => mockContractExecuteTx),
  ContractId: {
    fromString: jest.fn((id: string) => ({ id })),
  },
  PrivateKey: {
    generateED25519: jest.fn(() => ({ toString: () => 'mock-key' })),
  },
}));

jest.mock('ethers', () => ({
  ethers: {
    Interface: jest.fn(() => mockInterfaceInstance),
  },
  getBytes: jest.fn((val) => val), // Simple mock pass-through or specific implementation
}));

describe('ContractTransactionServiceImpl', () => {
  let contractService: ContractTransactionServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    contractService = new ContractTransactionServiceImpl();
  });

  describe('contractCreateFlowTransaction', () => {
    it('should create contract create flow with bytecode', () => {
      const params = {
        bytecode: '0x123456',
      } as ContractCreateFlowParams;

      const result = contractService.contractCreateFlowTransaction(params);

      expect(ContractCreateFlow).toHaveBeenCalledTimes(1);
      expect(mockContractCreateFlow.setBytecode).toHaveBeenCalledWith(
        '0x123456',
      );
      expect(result.transaction).toBe(mockContractCreateFlow);
    });

    it('should set admin key when provided', () => {
      const params = {
        bytecode: '0x123456',
        adminKey: mockAdminKey,
        constructorParameters: [],
        abiDefinition: '[{}]',
        gas: 500,
      } as ContractCreateFlowParams;

      contractService.contractCreateFlowTransaction(params);

      expect(mockContractCreateFlow.setAdminKey).toHaveBeenCalledWith(
        mockAdminKey,
      );
    });

    it('should set gas when provided', () => {
      const params = {
        bytecode: '0x123456',
        gas: 100000,
      } as ContractCreateFlowParams;

      contractService.contractCreateFlowTransaction(params);

      expect(mockContractCreateFlow.setGas).toHaveBeenCalledWith(100000);
    });

    it('should set memo when provided', () => {
      const params = {
        bytecode: '0x123456',
        memo: 'test memo',
      } as ContractCreateFlowParams;

      contractService.contractCreateFlowTransaction(params);

      expect(mockContractCreateFlow.setContractMemo).toHaveBeenCalledWith(
        'test memo',
      );
    });

    it('should set constructor parameters when abi and params provided', () => {
      const params = {
        bytecode: '0x123456',
        abiDefinition: '[{}]',
        constructorParameters: ['arg1'],
      } as ContractCreateFlowParams;

      (getBytes as jest.Mock).mockReturnValueOnce(new Uint8Array([0x12, 0x34]));

      contractService.contractCreateFlowTransaction(params);

      expect(ethers.Interface).toHaveBeenCalledWith(params.abiDefinition);
      expect(mockEncodeDeploy).toHaveBeenCalledWith(['arg1']);
      //   expect(getBytes).toHaveBeenCalledWith('0x1234'); // Check if getBytes is called with result of encodeDeploy
      expect(
        mockContractCreateFlow.setConstructorParameters,
      ).toHaveBeenCalledWith(new Uint8Array([0x12, 0x34]));
    });
  });

  describe('contractExecuteTransaction', () => {
    it('should create contract execute transaction with contractId, gas and function with parameters', () => {
      const params: ContractExecuteParams = {
        contractId: '0.0.1234',
        gas: 250000,
        functionName: 'transfer',
        // using a double cast here to avoid depending on actual ContractFunctionParameters implementation
        functionParameters: {} as unknown as ContractFunctionParameters,
      };

      const result = contractService.contractExecuteTransaction(params);

      expect(ContractExecuteTransaction).toHaveBeenCalledTimes(1);
      expect(ContractId.fromString).toHaveBeenCalledWith('0.0.1234');
      expect(mockContractExecuteTx.setContractId).toHaveBeenCalledWith({
        id: '0.0.1234',
      });
      expect(mockContractExecuteTx.setGas).toHaveBeenCalledWith(250000);
      expect(mockContractExecuteTx.setFunction).toHaveBeenCalledWith(
        'transfer',
        params.functionParameters,
      );
      expect(result.transaction).toBe(mockContractExecuteTx);
    });

    it('should create contract execute transaction with only function name when parameters are not provided', () => {
      const params: ContractExecuteParams = {
        contractId: '0.0.1234',
        gas: 100000,
        functionName: 'pause',
      };

      const result = contractService.contractExecuteTransaction(params);

      expect(ContractExecuteTransaction).toHaveBeenCalledTimes(1);
      expect(mockContractExecuteTx.setContractId).toHaveBeenCalledWith({
        id: '0.0.1234',
      });
      expect(mockContractExecuteTx.setGas).toHaveBeenCalledWith(100000);
      // when no parameters present, the service calls setFunction twice (once with name+params guard failing, once with name only)
      expect(mockContractExecuteTx.setFunction).toHaveBeenCalledWith(
        'pause',
        undefined,
      );
      expect(result.transaction).toBe(mockContractExecuteTx);
    });
  });
});
