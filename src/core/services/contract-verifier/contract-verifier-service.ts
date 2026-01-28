import type { NetworkService } from '@/core';
import type { ContractVerifierService } from '@/core/services/contract-verifier/contract-verifier-service.interface';
import type {
  ContractVerificationParams,
  ContractVerificationResult,
  SmartContractVerifyApiErrorResponse,
  SmartContractVerifyApiOkResponse,
} from '@/core/services/contract-verifier/types';

import { NetworkChainMap } from '@/core/types/shared.types';

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
    const chainId = NetworkChainMap[network];
    const payload = {
      address: params.contractEvmAddress,
      chain: String(chainId),
      files: {
        'metadata.json': params.metadataContent,
        [params.contractFilename]: params.contractContent,
      },
    };
    try {
      const response = await fetch(ContractVerifierServiceImpl.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData =
            (await response.json()) as SmartContractVerifyApiErrorResponse;
          errorMessage = `${response.status} ${errorData.error}`;
        } catch {
          errorMessage = `${response.status} ${response.statusText}`;
        }

        throw new Error(
          `Failed to verify smart contract ${params.contractFilename} with address ${params.contractEvmAddress} on chain ${chainId}: ${errorMessage}`,
        );
      }

      const data = (await response.json()) as SmartContractVerifyApiOkResponse;

      return {
        address: data.result[0].address,
        chainId: data.result[0].chainId,
        status: data.result[0].status,
        message: data.result[0].message,
      };
    } catch (error) {
      throw new Error(
        `Failed to verify smart contract ${params.contractFilename} with address ${params.contractEvmAddress} on chain ${chainId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
