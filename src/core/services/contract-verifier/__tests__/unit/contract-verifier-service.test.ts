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

import axios from 'axios';

import { ContractVerifierServiceImpl } from '@/core/services/contract-verifier/contract-verifier-service';
import { NetworkConfig } from '@/core/types/shared.types';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ContractVerifierServiceImpl', () => {
  const NETWORK = 'testnet';
  const CHAIN_ID = NetworkConfig[NETWORK as keyof typeof NetworkConfig];

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

      mockedAxios.post.mockResolvedValueOnce({ data: apiResponse });

      const result = await service.verifyContract(baseParams);

      expect(networkServiceMock.getCurrentNetwork).toHaveBeenCalledTimes(1);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://server-verify.hashscan.io/verify',
        {
          address: baseParams.contractEvmAddress,
          chain: String(CHAIN_ID),
          files: {
            'metadata.json': baseParams.metadataContent,
            [baseParams.contractFilename]: baseParams.contractContent,
          },
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

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: errorPayload,
        },
      };

      mockedAxios.post.mockRejectedValueOnce(axiosError);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValueOnce(true);

      await expect(service.verifyContract(baseParams)).rejects.toThrow(
        `Failed to verify smart contract ${baseParams.contractFilename} with address ${baseParams.contractEvmAddress} on chain ${CHAIN_ID}: 400 ${errorPayload.error}`,
      );
    });

    it('should throw descriptive error when non-Axios error occurs', async () => {
      const genericError = new Error('Network down');

      mockedAxios.post.mockRejectedValueOnce(genericError);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValueOnce(false);

      await expect(service.verifyContract(baseParams)).rejects.toThrow(
        `Failed to verify smart contract ${baseParams.contractFilename} with address ${baseParams.contractEvmAddress} on chain ${CHAIN_ID}: ${genericError.message}`,
      );
    });
  });
});
