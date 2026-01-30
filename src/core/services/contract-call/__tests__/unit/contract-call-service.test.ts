/**
 * Unit tests for ContractCallServiceImpl
 * Tests mirror node contract calls
 */
import type { HederaMirrornodeService, Logger } from '@/core';
import type { CallMirrorNodeFunctionParams } from '@/core/services/contract-call/types';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { ContractCallServiceImpl } from '@/core/services/contract-call/contract-call-service';
import { ContractType } from '@/core/types/shared.types';

const mockEncodeFunctionData = jest.fn().mockReturnValue('0xencoded');
const mockDecodeFunctionResult = jest.fn();

jest.mock('@hashgraph/sdk', () => ({
  ContractId: {
    fromString: jest.fn(() => ({
      toEvmAddress: jest.fn(() => 'a'.repeat(40)),
    })),
  },
  TokenType: {
    NonFungibleUnique: 1,
    FungibleCommon: 0,
  },
}));

jest.mock('@/core/utils/contract-abi-resolver', () => ({
  resolveAndInitAbiInterface: jest.fn(() => ({
    encodeFunctionData: mockEncodeFunctionData,
    decodeFunctionResult: mockDecodeFunctionResult,
  })),
}));

describe('ContractCallServiceImpl', () => {
  let service: ContractCallServiceImpl;
  let mirrorService: jest.Mocked<HederaMirrornodeService>;
  let logger: jest.Mocked<Logger>;

  const CONTRACT_ID = '0.0.1234';

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    mirrorService = {
      postContractCall: jest.fn(),
    } as unknown as jest.Mocked<HederaMirrornodeService>;
    service = new ContractCallServiceImpl(mirrorService, logger);
    mockDecodeFunctionResult.mockReturnValue(['decodedValue']);
  });

  describe('callMirrorNodeFunction', () => {
    const baseParams: CallMirrorNodeFunctionParams = {
      contractType: ContractType.ERC20,
      functionName: 'name',
      contractId: CONTRACT_ID,
    };

    it('should encode, call mirror, decode and return result when no args', async () => {
      mirrorService.postContractCall.mockResolvedValue({
        result: '0xresult',
      });

      const result = await service.callMirrorNodeFunction(baseParams);

      expect(mockEncodeFunctionData).toHaveBeenCalledWith('name');
      expect(logger.info).toHaveBeenCalledWith(
        `Calling contract ${CONTRACT_ID} "name" function on mirror node`,
      );
      expect(mirrorService.postContractCall).toHaveBeenCalledWith({
        to: `0x${'a'.repeat(40)}`,
        data: '0xencoded',
      });
      expect(mockDecodeFunctionResult).toHaveBeenCalledWith('name', '0xresult');
      expect(result).toBe('decodedValue');
    });

    it('should encode with args when args provided', async () => {
      mirrorService.postContractCall.mockResolvedValue({
        result: '0xresult',
      });
      const params: CallMirrorNodeFunctionParams = {
        ...baseParams,
        functionName: 'balanceOf',
        args: ['0xowner'],
      };

      await service.callMirrorNodeFunction(params);

      expect(mockEncodeFunctionData).toHaveBeenCalledWith('balanceOf', [
        '0xowner',
      ]);
    });

    it('should throw when response has no result', async () => {
      mirrorService.postContractCall.mockResolvedValue(
        {} as { result: string },
      );

      await expect(service.callMirrorNodeFunction(baseParams)).rejects.toThrow(
        `There was a problem with calling contract ${CONTRACT_ID} "name" function`,
      );
    });

    it('should throw when response.result is empty', async () => {
      mirrorService.postContractCall.mockResolvedValue({
        result: '',
      });

      await expect(service.callMirrorNodeFunction(baseParams)).rejects.toThrow(
        `There was a problem with calling contract ${CONTRACT_ID} "name" function`,
      );
    });

    it('should throw when decode returns empty', async () => {
      mirrorService.postContractCall.mockResolvedValue({
        result: '0xresult',
      });
      mockDecodeFunctionResult.mockReturnValueOnce([]);

      await expect(service.callMirrorNodeFunction(baseParams)).rejects.toThrow(
        `There was a problem with decoding contract ${CONTRACT_ID} "name" function result`,
      );
    });

    it('should throw when decode returns undefined first element', async () => {
      mirrorService.postContractCall.mockResolvedValue({
        result: '0xresult',
      });
      mockDecodeFunctionResult.mockReturnValueOnce([undefined]);

      await expect(service.callMirrorNodeFunction(baseParams)).rejects.toThrow(
        `There was a problem with decoding contract ${CONTRACT_ID} "name" function result`,
      );
    });

    it('should throw when postContractCall rejects', async () => {
      mirrorService.postContractCall.mockRejectedValue(
        new Error('network error'),
      );

      await expect(service.callMirrorNodeFunction(baseParams)).rejects.toThrow(
        'network error',
      );
    });
  });
});
