/**
 * Unit tests for ContractVerifierServiceImpl
 * Tests smart contract verification requests and error handling
 */
import type { NetworkService } from '@/core';
import type {
  ContractVerificationParams,
  SmartContractVerifyApiErrorResponse,
  SmartContractVerifyApiOkResponse,
} from '@/core/services/contract-verifier/types';

import { ContractVerifierServiceImpl } from '@/core/services/contract-verifier/contract-verifier-service';
import { NetworkChainMap } from '@/core/types/shared.types';

jest.mock('@/core/utils/solidity-file-importer', () => ({
  scanSolidityFiles: jest.fn(() => ({
    'MyContract.sol': 'contracts/MyContract.sol',
  })),
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('contract MyContract {}'),
}));

describe('ContractVerifierServiceImpl', () => {
  const NETWORK = 'testnet';
  const CHAIN_ID = NetworkChainMap[NETWORK as keyof typeof NetworkChainMap];

  let networkServiceMock: jest.Mocked<NetworkService>;
  let service: ContractVerifierServiceImpl;

  const baseParams: ContractVerificationParams = {
    contractEvmAddress: '0x1234567890abcdef',
    contractFile: 'contracts/MyContract.sol',
    metadataContent: '{"compiler":{"version":"0.8.0"}}',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // reset global.fetch before each test
    global.fetch = jest.fn() as unknown as typeof fetch;

    networkServiceMock = {
      getCurrentNetwork: jest.fn().mockReturnValue(NETWORK),
    } as unknown as jest.Mocked<NetworkService>;

    service = new ContractVerifierServiceImpl(networkServiceMock);
  });

  describe('verifyContract', () => {
    it('should call verify API with correct payload and return mapped result', async () => {
      const apiResponse: SmartContractVerifyApiOkResponse = {
        result: [
          {
            address: '0xverified',
            chainId: String(CHAIN_ID),
            status: 'success',
            message: 'Contract verified',
            libraryMap: {},
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(apiResponse),
      });

      const result = await service.verifyContract(baseParams);

      expect(networkServiceMock.getCurrentNetwork).toHaveBeenCalledTimes(1);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://server-verify.hashscan.io/verify',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining(baseParams.contractEvmAddress),
        }),
      );

      expect(result).toEqual({
        success: true,
        address: '0xverified',
        chainId: String(CHAIN_ID),
        status: 'success',
        message: 'Contract verified',
      });
    });

    it('should return success false and API error message when API responds with error payload', async () => {
      const errorPayload: SmartContractVerifyApiErrorResponse = {
        error: 'Invalid metadata',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue(errorPayload),
      });

      const result = await service.verifyContract(baseParams);

      expect(result).toEqual({
        success: false,
        errorMessage: errorPayload.error,
      });
    });

    it('should return success false and error message when fetch rejects', async () => {
      const genericError = new Error('Network down');

      (global.fetch as jest.Mock).mockRejectedValueOnce(genericError);

      const result = await service.verifyContract(baseParams);

      expect(result).toEqual({
        success: false,
        errorMessage: genericError.message,
      });
    });
  });
});
