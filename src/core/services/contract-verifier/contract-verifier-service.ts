import type { NetworkService } from '@/core';
import type { ContractVerifierService } from '@/core/services/contract-verifier/contract-verifier-service.interface';
import type {
  ContractVerificationParams,
  ContractVerificationResult,
  SmartContractVerifyApiErrorResponse,
  SmartContractVerifyApiOkResponse,
} from '@/core/services/contract-verifier/types';

import axios from 'axios';

import { NetworkConfig } from '@/core/types/shared.types';

export class ContractVerifierServiceImpl implements ContractVerifierService {
  private static readonly BASE_URL = 'https://server-verify.hashscan.io/verify';
  private networkService: NetworkService;

  constructor(networkService: NetworkService) {
    this.networkService = networkService;
  }
  async verifyContract(
    params: ContractVerificationParams,
  ): Promise<ContractVerificationResult> {
    const network = this.networkService.getCurrentNetwork();
    const chainId = NetworkConfig[network];
    const payload = {
      address: params.contractEvmAddress,
      chain: String(chainId),
      files: {
        'metadata.json': params.metadataContent,
        [params.contractFilename]: params.contractContent,
      },
    };
    try {
      const response = await axios.post<SmartContractVerifyApiOkResponse>(
        ContractVerifierServiceImpl.BASE_URL,
        payload,
      );

      const data = response.data;

      return {
        address: data.result[0].address,
        chainId: data.result[0].chainId,
        status: data.result[0].status,
        message: data.result[0].message,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response
          .data as SmartContractVerifyApiErrorResponse;
        throw new Error(
          `Failed to verify smart contract ${params.contractFilename} with address ${params.contractEvmAddress} on chain ${chainId}: ${error.response.status} ${errorData.error}`,
        );
      }

      throw new Error(
        `Failed to verify smart contract ${params.contractFilename} with address ${params.contractEvmAddress} on chain ${chainId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
