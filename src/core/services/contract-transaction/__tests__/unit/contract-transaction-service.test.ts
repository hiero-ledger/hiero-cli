/**
 * Unit tests for ContractTransactionServiceImpl
 * Tests contract creation flow transaction construction
 */
import type { ContractFunctionParameters, Key } from '@hiero-ledger/sdk';
import type {
  ContractCreateFlowParams,
  ContractExecuteEncodedParams,
  ContractExecuteParams,
  DeleteContractParams,
  UpdateContractParams,
} from '@/core/services/contract-transaction/types';

import {
  ContractCreateFlow,
  ContractDeleteTransaction,
  ContractExecuteTransaction,
  ContractId,
  ContractUpdateTransaction,
  PrivateKey,
} from '@hiero-ledger/sdk';
import { ethers, getBytes } from 'ethers';

import { ContractTransactionServiceImpl } from '@/core/services/contract-transaction/contract-transaction-service';

import {
  createMockContractCreateFlow,
  createMockContractDeleteTransaction,
  createMockContractExecuteTransaction,
  createMockContractUpdateTransaction,
} from './mocks';

const mockContractCreateFlow = createMockContractCreateFlow();
const mockContractExecuteTx = createMockContractExecuteTransaction();
const mockContractDeleteTx = createMockContractDeleteTransaction();
const mockContractUpdateTx = createMockContractUpdateTransaction();
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
  ContractDeleteTransaction: jest.fn(() => mockContractDeleteTx),
  ContractExecuteTransaction: jest.fn(() => mockContractExecuteTx),
  ContractUpdateTransaction: jest.fn(() => mockContractUpdateTx),
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

  describe('deleteContract', () => {
    it('should create ContractDeleteTransaction with contractId', () => {
      const params: DeleteContractParams = { contractId: '0.0.1234' };

      const result = contractService.deleteContract(params);

      expect(ContractDeleteTransaction).toHaveBeenCalledTimes(1);
      expect(ContractId.fromString).toHaveBeenCalledWith('0.0.1234');
      expect(mockContractDeleteTx.setContractId).toHaveBeenCalledWith({
        id: '0.0.1234',
      });
      expect(result.transaction).toBe(mockContractDeleteTx);
    });

    it('should set transferAccountId when provided', () => {
      const params: DeleteContractParams = {
        contractId: '0.0.1234',
        transferAccountId: '0.0.5678',
      };

      contractService.deleteContract(params);

      expect(mockAccountIdFromString).toHaveBeenCalledWith('0.0.5678');
      expect(mockContractDeleteTx.setTransferAccountId).toHaveBeenCalledWith({
        id: '0.0.5678',
      });
    });

    it('should set transferContractId when provided', () => {
      const params: DeleteContractParams = {
        contractId: '0.0.1234',
        transferContractId: '0.0.9999',
      };

      contractService.deleteContract(params);

      expect(ContractId.fromString).toHaveBeenCalledWith('0.0.9999');
      expect(mockContractDeleteTx.setTransferContractId).toHaveBeenCalledWith({
        id: '0.0.9999',
      });
    });

    it('should not set transfer fields when not provided', () => {
      const params: DeleteContractParams = { contractId: '0.0.1234' };

      contractService.deleteContract(params);

      expect(mockContractDeleteTx.setTransferAccountId).not.toHaveBeenCalled();
      expect(mockContractDeleteTx.setTransferContractId).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when ContractId.fromString throws', () => {
      (ContractId.fromString as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid contract ID');
      });

      const params: DeleteContractParams = { contractId: 'invalid-id' };

      expect(() => contractService.deleteContract(params)).toThrow(
        'Invalid contract delete parameters',
      );
    });
  });

  describe('updateContract', () => {
    it('should create ContractUpdateTransaction with contractId', () => {
      const params: UpdateContractParams = { contractId: '0.0.1234' };

      const result = contractService.updateContract(params);

      expect(ContractUpdateTransaction).toHaveBeenCalledTimes(1);
      expect(ContractId.fromString).toHaveBeenCalledWith('0.0.1234');
      expect(mockContractUpdateTx.setContractId).toHaveBeenCalledWith({
        id: '0.0.1234',
      });
      expect(result.transaction).toBe(mockContractUpdateTx);
    });

    it('should set adminKey when provided', () => {
      const mockKey = {
        _type: 'ED25519',
      } as unknown as Key;
      const params: UpdateContractParams = {
        contractId: '0.0.1234',
        adminKey: mockKey,
      };

      contractService.updateContract(params);

      expect(mockContractUpdateTx.setAdminKey).toHaveBeenCalledWith(mockKey);
    });

    it('should set memo when provided', () => {
      const params: UpdateContractParams = {
        contractId: '0.0.1234',
        memo: 'new memo',
      };

      contractService.updateContract(params);

      expect(mockContractUpdateTx.setContractMemo).toHaveBeenCalledWith(
        'new memo',
      );
      expect(mockContractUpdateTx.clearContractMemo).not.toHaveBeenCalled();
    });

    it('should call clearContractMemo when memo is null', () => {
      const params: UpdateContractParams = {
        contractId: '0.0.1234',
        memo: null,
      };

      contractService.updateContract(params);

      expect(mockContractUpdateTx.clearContractMemo).toHaveBeenCalledTimes(1);
      expect(mockContractUpdateTx.setContractMemo).not.toHaveBeenCalled();
    });

    it('should set autoRenewPeriod when provided', () => {
      const params: UpdateContractParams = {
        contractId: '0.0.1234',
        autoRenewPeriod: 7776000,
      };

      contractService.updateContract(params);

      expect(mockContractUpdateTx.setAutoRenewPeriod).toHaveBeenCalledWith(
        7776000,
      );
    });

    it('should set autoRenewAccountId when provided', () => {
      const params: UpdateContractParams = {
        contractId: '0.0.1234',
        autoRenewAccountId: '0.0.500',
      };

      contractService.updateContract(params);

      expect(mockAccountIdFromString).toHaveBeenCalledWith('0.0.500');
      expect(mockContractUpdateTx.setAutoRenewAccountId).toHaveBeenCalledWith({
        id: '0.0.500',
      });
      expect(
        mockContractUpdateTx.clearAutoRenewAccountId,
      ).not.toHaveBeenCalled();
    });

    it('should call clearAutoRenewAccountId when autoRenewAccountId is null', () => {
      const params: UpdateContractParams = {
        contractId: '0.0.1234',
        autoRenewAccountId: null,
      };

      contractService.updateContract(params);

      expect(
        mockContractUpdateTx.clearAutoRenewAccountId,
      ).toHaveBeenCalledTimes(1);
      expect(mockContractUpdateTx.setAutoRenewAccountId).not.toHaveBeenCalled();
    });

    it('should set maxAutomaticTokenAssociations when provided', () => {
      const params: UpdateContractParams = {
        contractId: '0.0.1234',
        maxAutomaticTokenAssociations: 10,
      };

      contractService.updateContract(params);

      expect(
        mockContractUpdateTx.setMaxAutomaticTokenAssociations,
      ).toHaveBeenCalledWith(10);
    });

    it('should set stakedAccountId when provided', () => {
      const params: UpdateContractParams = {
        contractId: '0.0.1234',
        stakedAccountId: '0.0.300',
      };

      contractService.updateContract(params);

      expect(mockContractUpdateTx.setStakedAccountId).toHaveBeenCalledWith(
        '0.0.300',
      );
    });

    it('should set stakedNodeId when provided', () => {
      const params: UpdateContractParams = {
        contractId: '0.0.1234',
        stakedNodeId: 3,
      };

      contractService.updateContract(params);

      expect(mockContractUpdateTx.setStakedNodeId).toHaveBeenCalledWith(3);
    });

    it('should set declineStakingReward when provided', () => {
      const params: UpdateContractParams = {
        contractId: '0.0.1234',
        declineStakingReward: true,
      };

      contractService.updateContract(params);

      expect(mockContractUpdateTx.setDeclineStakingReward).toHaveBeenCalledWith(
        true,
      );
    });

    it('should not set optional fields when not provided', () => {
      const params: UpdateContractParams = { contractId: '0.0.1234' };

      contractService.updateContract(params);

      expect(mockContractUpdateTx.setAdminKey).not.toHaveBeenCalled();
      expect(mockContractUpdateTx.setContractMemo).not.toHaveBeenCalled();
      expect(mockContractUpdateTx.clearContractMemo).not.toHaveBeenCalled();
      expect(mockContractUpdateTx.setAutoRenewPeriod).not.toHaveBeenCalled();
      expect(mockContractUpdateTx.setAutoRenewAccountId).not.toHaveBeenCalled();
      expect(
        mockContractUpdateTx.clearAutoRenewAccountId,
      ).not.toHaveBeenCalled();
      expect(
        mockContractUpdateTx.setMaxAutomaticTokenAssociations,
      ).not.toHaveBeenCalled();
      expect(mockContractUpdateTx.setStakedAccountId).not.toHaveBeenCalled();
      expect(mockContractUpdateTx.setStakedNodeId).not.toHaveBeenCalled();
      expect(
        mockContractUpdateTx.setDeclineStakingReward,
      ).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when ContractId.fromString throws', () => {
      (ContractId.fromString as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid contract ID');
      });

      const params: UpdateContractParams = { contractId: 'invalid-id' };

      expect(() => contractService.updateContract(params)).toThrow(
        'Invalid contract update parameters',
      );
    });
  });
});
