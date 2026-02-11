import type { NetworkService } from '@/core';
import type { ContractVerifierService } from '@/core/services/contract-verifier/contract-verifier-service.interface';
import type {
  ContractVerificationParams,
  ContractVerificationResult,
  SmartContractVerifyApiErrorResponse,
  SmartContractVerifyApiOkResponse,
} from '@/core/services/contract-verifier/types';

import fs from 'fs/promises';
import path from 'path';

import { NetworkChainMap } from '@/core/types/shared.types';
import { scanSolidityFiles } from '@/core/utils/solidity-file-importer-util';

export class ContractVerifierServiceImpl implements ContractVerifierService {
  private static readonly BASE_URL = 'https://server-verify.hashscan.io/verify';
  private networkService: NetworkService;

  constructor(networkService: NetworkService) {
    this.networkService = networkService;
  }
  async verifyContract(
    params: ContractVerificationParams,
  ): Promise<ContractVerificationResult> {
    const contractDirectory = path.dirname(params.contractFile);
    const network = this.networkService.getCurrentNetwork();
    const chainId = NetworkChainMap[network];

    const soliditySourceFileMap = scanSolidityFiles(
      contractDirectory,
      contractDirectory,
    );
    const files: Record<string, string> = {
      'metadata.json': params.metadataContent,
    };

    for (const fullPath of Object.values(soliditySourceFileMap)) {
      const basename = path.basename(fullPath);
      files[basename] = await fs.readFile(fullPath, 'utf-8');
    }

    const payload = {
      address: params.contractEvmAddress,
      chain: String(chainId),
      files,
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
          errorMessage =
            errorData.error ?? `${response.status} ${response.statusText}`;
        } catch {
          errorMessage = `${response.status} ${response.statusText}`;
        }

        return {
          success: false,
          errorMessage,
        };
      }

      const data = (await response.json()) as SmartContractVerifyApiOkResponse;

      return {
        success: true,
        address: data.result[0].address,
        chainId: data.result[0].chainId,
        status: data.result[0].status,
        message: data.result[0].message,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
