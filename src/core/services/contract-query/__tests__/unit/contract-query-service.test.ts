/**
 * Unit tests for ContractQueryServiceImpl
 * Tests contract query via mirror node (getContractInfo + postContractCall)
 */
import type { HederaMirrornodeService, Logger } from '@/core';
import type { QueryContractFunctionParams } from '@/core/services/contract-query/types';
import type { ContractInfo } from '@/core/services/mirrornode/types';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { ContractQueryServiceImpl } from '@/core/services/contract-query/contract-query-service';

const CONTRACT_ID = '0.0.1234';
const EVM_ADDRESS = '0x' + 'a'.repeat(40);

const mockEncodeFunctionData = jest.fn().mockReturnValue('0xencoded');
const mockDecodeFunctionResult = jest.fn();

function createMockAbiInterface() {
  return {
    encodeFunctionData: mockEncodeFunctionData,
    decodeFunctionResult: mockDecodeFunctionResult,
  } as unknown as QueryContractFunctionParams['abiInterface'];
}

describe('ContractQueryServiceImpl', () => {
  let service: ContractQueryServiceImpl;
  let mirrorService: jest.Mocked<HederaMirrornodeService>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    const contractInfo: ContractInfo = {
      contract_id: CONTRACT_ID,
      account: '0.0.100',
      created_timestamp: '2024-01-01T00:00:00.000Z',
      deleted: false,
      memo: '',
      evm_address: EVM_ADDRESS,
      auto_renew_period: 0,
      max_automatic_token_associations: 0,
    };
    mirrorService = {
      getContractInfo: jest.fn().mockResolvedValue(contractInfo),
      postContractCall: jest.fn().mockResolvedValue({
        result: '0xresult',
      }),
    } as unknown as jest.Mocked<HederaMirrornodeService>;
    service = new ContractQueryServiceImpl(mirrorService, logger);
    mockDecodeFunctionResult.mockReturnValue(['decodedValue']);
  });

  describe('queryContractFunction', () => {
    const baseParams: QueryContractFunctionParams = {
      abiInterface: createMockAbiInterface(),
      functionName: 'name',
      contractIdOrEvmAddress: CONTRACT_ID,
    };

    it('calls getContractInfo, postContractCall, decodes and returns result', async () => {
      const result = await service.queryContractFunction(baseParams);

      expect(mirrorService.getContractInfo).toHaveBeenCalledWith(CONTRACT_ID);
      expect(mockEncodeFunctionData).toHaveBeenCalledWith('name', undefined);
      expect(logger.info).toHaveBeenCalledWith(
        `Calling contract ${CONTRACT_ID} "name" function on mirror node`,
      );
      expect(mirrorService.postContractCall).toHaveBeenCalledWith({
        to: EVM_ADDRESS,
        data: '0xencoded',
      });
      expect(mockDecodeFunctionResult).toHaveBeenCalledWith('name', '0xresult');
      expect(result.contractId).toBe(CONTRACT_ID);
      expect(result.queryResult).toEqual(['decodedValue']);
    });

    it('encodes with args when args provided', async () => {
      const params: QueryContractFunctionParams = {
        ...baseParams,
        functionName: 'balanceOf',
        args: ['0xowner'],
      };
      await service.queryContractFunction(params);

      expect(mockEncodeFunctionData).toHaveBeenCalledWith('balanceOf', [
        '0xowner',
      ]);
    });

    it('accepts EVM address as contractIdOrEvmAddress', async () => {
      const contractInfo: ContractInfo = {
        contract_id: CONTRACT_ID,
        account: '0.0.100',
        created_timestamp: '2024-01-01T00:00:00.000Z',
        deleted: false,
        memo: '',
        evm_address: EVM_ADDRESS,
        auto_renew_period: 0,
        max_automatic_token_associations: 0,
      };
      mirrorService.getContractInfo.mockResolvedValue(contractInfo);

      await service.queryContractFunction({
        ...baseParams,
        contractIdOrEvmAddress: EVM_ADDRESS,
      });

      expect(mirrorService.getContractInfo).toHaveBeenCalledWith(EVM_ADDRESS);
    });

    it('throws when getContractInfo returns null', async () => {
      (mirrorService.getContractInfo as jest.Mock).mockResolvedValue(null);

      await expect(service.queryContractFunction(baseParams)).rejects.toThrow(
        `Contract ${CONTRACT_ID} not found`,
      );
      expect(mirrorService.postContractCall).not.toHaveBeenCalled();
    });

    it('throws when contract has no evm_address', async () => {
      const contractInfoNoEvm: ContractInfo = {
        contract_id: CONTRACT_ID,
        account: '0.0.100',
        created_timestamp: '2024-01-01T00:00:00.000Z',
        deleted: false,
        memo: '',
        evm_address: undefined,
        auto_renew_period: 0,
        max_automatic_token_associations: 0,
      };
      mirrorService.getContractInfo.mockResolvedValue(contractInfoNoEvm);

      await expect(service.queryContractFunction(baseParams)).rejects.toThrow(
        `Contract ${CONTRACT_ID} does not have an EVM address`,
      );
      expect(mirrorService.postContractCall).not.toHaveBeenCalled();
    });

    it('throws when postContractCall returns no result', async () => {
      mirrorService.postContractCall.mockResolvedValue(
        {} as { result: string },
      );

      await expect(service.queryContractFunction(baseParams)).rejects.toThrow(
        `There was a problem with calling contract ${CONTRACT_ID} "name" function`,
      );
    });

    it('throws when postContractCall returns empty result', async () => {
      mirrorService.postContractCall.mockResolvedValue({
        result: '',
      });

      await expect(service.queryContractFunction(baseParams)).rejects.toThrow(
        `There was a problem with calling contract ${CONTRACT_ID} "name" function`,
      );
    });

    it('throws when postContractCall rejects', async () => {
      mirrorService.postContractCall.mockRejectedValue(
        new Error('network error'),
      );

      await expect(service.queryContractFunction(baseParams)).rejects.toThrow(
        'network error',
      );
    });
  });
});
