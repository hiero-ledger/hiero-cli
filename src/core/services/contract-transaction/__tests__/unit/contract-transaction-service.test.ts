/**
 * Unit tests for ContractTransactionServiceImpl
 * Tests contract creation flow transaction construction
 */
import type { ContractFunctionParameters } from '@hiero-ledger/sdk';
import type {
  ContractCreateFlowParams,
  ContractExecuteEncodedParams,
  ContractExecuteParams,
} from '@/core/services/contract-transaction/types';

import {
  ContractCreateFlow,
  ContractExecuteTransaction,
  ContractId,
  PrivateKey,
} from '@hiero-ledger/sdk';
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

const mockAccountIdFromString = jest.fn((id: string) => ({ id }));
const mockHbarFromTinybars = jest.fn((val: string) => ({ tinybars: val }));

jest.mock('@hiero-ledger/sdk', () => ({
  ContractCreateFlow: jest.fn(() => mockContractCreateFlow),
  ContractExecuteTransaction: jest.fn(() => mockContractExecuteTx),
  ContractId: {
    fromString: jest.fn((id: string) => ({ id })),
  },
  AccountId: {
    fromString: (id: string) => mockAccountIdFromString(id),
  },
  Hbar: {
    fromTinybars: (val: string) => mockHbarFromTinybars(val),
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

    it('should set initial balance when provided', () => {
      const params = {
        bytecode: '0x123456',
        initialBalanceRaw: BigInt(100_000_000),
      } as ContractCreateFlowParams;

      contractService.contractCreateFlowTransaction(params);

      expect(mockHbarFromTinybars).toHaveBeenCalledWith('100000000');
      expect(mockContractCreateFlow.setInitialBalance).toHaveBeenCalledWith({
        tinybars: '100000000',
      });
    });

    it('should not set initial balance when not provided', () => {
      const params = { bytecode: '0x123456' } as ContractCreateFlowParams;

      contractService.contractCreateFlowTransaction(params);

      expect(mockContractCreateFlow.setInitialBalance).not.toHaveBeenCalled();
    });

    it('should set auto-renew period when provided', () => {
      const params = {
        bytecode: '0x123456',
        autoRenewPeriod: 7776000,
      } as ContractCreateFlowParams;

      contractService.contractCreateFlowTransaction(params);

      expect(mockContractCreateFlow.setAutoRenewPeriod).toHaveBeenCalledWith(
        7776000,
      );
    });

    it('should set auto-renew account ID when provided', () => {
      const params = {
        bytecode: '0x123456',
        autoRenewAccountId: '0.0.500',
      } as ContractCreateFlowParams;

      contractService.contractCreateFlowTransaction(params);

      expect(mockAccountIdFromString).toHaveBeenCalledWith('0.0.500');
      expect(mockContractCreateFlow.setAutoRenewAccountId).toHaveBeenCalledWith(
        { id: '0.0.500' },
      );
    });

    it('should set max automatic token associations when provided', () => {
      const params = {
        bytecode: '0x123456',
        maxAutomaticTokenAssociations: 10,
      } as ContractCreateFlowParams;

      contractService.contractCreateFlowTransaction(params);

      expect(
        mockContractCreateFlow.setMaxAutomaticTokenAssociations,
      ).toHaveBeenCalledWith(10);
    });

    it('should set staked account ID when provided', () => {
      const params = {
        bytecode: '0x123456',
        stakedAccountId: '0.0.300',
      } as ContractCreateFlowParams;

      contractService.contractCreateFlowTransaction(params);

      expect(mockContractCreateFlow.setStakedAccountId).toHaveBeenCalledWith(
        '0.0.300',
      );
    });

    it('should set staked node ID when provided', () => {
      const params = {
        bytecode: '0x123456',
        stakedNodeId: 3,
      } as ContractCreateFlowParams;

      contractService.contractCreateFlowTransaction(params);

      expect(mockContractCreateFlow.setStakedNodeId).toHaveBeenCalledWith(3);
    });

    it('should set decline staking reward when provided', () => {
      const params = {
        bytecode: '0x123456',
        declineStakingReward: true,
      } as ContractCreateFlowParams;

      contractService.contractCreateFlowTransaction(params);

      expect(
        mockContractCreateFlow.setDeclineStakingReward,
      ).toHaveBeenCalledWith(true);
    });

    it('should not set optional fields when not provided', () => {
      const params = { bytecode: '0x123456' } as ContractCreateFlowParams;

      contractService.contractCreateFlowTransaction(params);

      expect(mockContractCreateFlow.setAutoRenewPeriod).not.toHaveBeenCalled();
      expect(
        mockContractCreateFlow.setAutoRenewAccountId,
      ).not.toHaveBeenCalled();
      expect(
        mockContractCreateFlow.setMaxAutomaticTokenAssociations,
      ).not.toHaveBeenCalled();
      expect(mockContractCreateFlow.setStakedAccountId).not.toHaveBeenCalled();
      expect(mockContractCreateFlow.setStakedNodeId).not.toHaveBeenCalled();
      expect(
        mockContractCreateFlow.setDeclineStakingReward,
      ).not.toHaveBeenCalled();
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
      expect(mockContractExecuteTx.setFunction).toHaveBeenCalledWith(
        'pause',
        undefined,
      );
      expect(result.transaction).toBe(mockContractExecuteTx);
    });

    it('should set payable amount when payableAmountTinybars is provided', () => {
      const params: ContractExecuteParams = {
        contractId: '0.0.1234',
        gas: 100000,
        functionName: 'deposit',
        payableAmountTinybars: '500000000',
      };

      contractService.contractExecuteTransaction(params);

      expect(mockHbarFromTinybars).toHaveBeenCalledWith('500000000');
      expect(mockContractExecuteTx.setPayableAmount).toHaveBeenCalledWith({
        tinybars: '500000000',
      });
    });

    it('should not set payable amount when payableAmountTinybars is not provided', () => {
      const params: ContractExecuteParams = {
        contractId: '0.0.1234',
        gas: 100000,
        functionName: 'transfer',
      };

      contractService.contractExecuteTransaction(params);

      expect(mockContractExecuteTx.setPayableAmount).not.toHaveBeenCalled();
    });
  });

  describe('contractExecuteWithEncodedParams', () => {
    it('should create contract execute transaction with encoded function parameters', () => {
      const encodedParams = new Uint8Array([0xab, 0xcd, 0xef]);
      const params: ContractExecuteEncodedParams = {
        contractId: '0.0.5678',
        gas: 150000,
        functionParametersEncoded: encodedParams,
      };

      const result = contractService.contractExecuteWithEncodedParams(params);

      expect(ContractExecuteTransaction).toHaveBeenCalledTimes(1);
      expect(ContractId.fromString).toHaveBeenCalledWith('0.0.5678');
      expect(mockContractExecuteTx.setContractId).toHaveBeenCalledWith({
        id: '0.0.5678',
      });
      expect(mockContractExecuteTx.setGas).toHaveBeenCalledWith(150000);
      expect(mockContractExecuteTx.setFunctionParameters).toHaveBeenCalledWith(
        encodedParams,
      );
      expect(mockContractExecuteTx.setFunction).not.toHaveBeenCalled();
      expect(result.transaction).toBe(mockContractExecuteTx);
    });

    it('should set payable amount when payableAmountTinybars is provided', () => {
      const params: ContractExecuteEncodedParams = {
        contractId: '0.0.5678',
        gas: 150000,
        functionParametersEncoded: new Uint8Array([0x01]),
        payableAmountTinybars: '1000000000',
      };

      contractService.contractExecuteWithEncodedParams(params);

      expect(mockHbarFromTinybars).toHaveBeenCalledWith('1000000000');
      expect(mockContractExecuteTx.setPayableAmount).toHaveBeenCalledWith({
        tinybars: '1000000000',
      });
    });

    it('should not set payable amount when payableAmountTinybars is not provided', () => {
      const params: ContractExecuteEncodedParams = {
        contractId: '0.0.5678',
        gas: 150000,
        functionParametersEncoded: new Uint8Array([0x01]),
      };

      contractService.contractExecuteWithEncodedParams(params);

      expect(mockContractExecuteTx.setPayableAmount).not.toHaveBeenCalled();
    });
  });
});
