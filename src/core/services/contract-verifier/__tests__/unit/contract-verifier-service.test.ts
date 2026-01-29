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

describe('ContractVerifierServiceImpl', () => {
  const NETWORK = 'testnet';
  const CHAIN_ID = NetworkChainMap[NETWORK as keyof typeof NetworkChainMap];

  let networkServiceMock: jest.Mocked<NetworkService>;
  let service: ContractVerifierServiceImpl;

  const baseParams: ContractVerificationParams = {
    contractEvmAddress: '0x1234567890abcdef',
    contractFilename: 'contracts/MyContract.sol',
    contractContent: 'contract MyContract {}',
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
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: baseParams.contractEvmAddress,
            chain: String(CHAIN_ID),
            files: {
              'metadata.json': baseParams.metadataContent,
              [baseParams.contractFilename]: baseParams.contractContent,
            },
          }),
        },
      );

      expect(result).toEqual({
        address: '0xverified',
        chainId: String(CHAIN_ID),
        status: 'success',
        message: 'Contract verified',
      });
    });

    it('should throw descriptive error when API responds with error payload', async () => {
      const errorPayload: SmartContractVerifyApiErrorResponse = {
        error: 'Invalid metadata',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue(errorPayload),
      });

      await expect(service.verifyContract(baseParams)).rejects.toThrow(
        `Failed to verify smart contract ${baseParams.contractFilename} with address ${baseParams.contractEvmAddress} on chain ${CHAIN_ID}: 400 ${errorPayload.error}`,
      );
    });

    it('should throw descriptive error when non-Axios error occurs', async () => {
      const genericError = new Error('Network down');

      (global.fetch as jest.Mock).mockRejectedValueOnce(genericError);

      await expect(service.verifyContract(baseParams)).rejects.toThrow(
        `Failed to verify smart contract ${baseParams.contractFilename} with address ${baseParams.contractEvmAddress} on chain ${CHAIN_ID}: ${genericError.message}`,
      );
    });
  });
});
