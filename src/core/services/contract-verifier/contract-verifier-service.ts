import type { NetworkService } from '@/core';
import type { ContractVerifierService } from '@/core/services/contract-verifier/contract-verifier-service.interface';
import type {
  ContractVerificationParams,
  ContractVerificationResult,
} from '@/core/services/contract-verifier/types';

import fs from 'fs/promises';
import path from 'path';

import { CliError, NetworkError } from '@/core/errors';
import {
  CheckByAddressesResponseSchema,
  SmartContractVerifyApiErrorResponseSchema,
  SmartContractVerifyApiOkResponseSchema,
} from '@/core/services/contract-verifier/schema';
import {
  HASHSCAN_VERIFICATION_STATUS_PERFECT,
  HASHSCAN_VERIFY_ORIGIN,
} from '@/core/shared/constants';
import { parseWithSchema } from '@/core/shared/validation/parse-with-schema.zod';
import { NetworkChainMap } from '@/core/types/shared.types';
import { scanSolidityFiles } from '@/core/utils/solidity-file-importer';

export class ContractVerifierServiceImpl implements ContractVerifierService {
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
      const response = await fetch(`${HASHSCAN_VERIFY_ORIGIN}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage: string;
        try {
          const parsed = SmartContractVerifyApiErrorResponseSchema.safeParse(
            await response.json(),
          );
          errorMessage = parsed.success
            ? (parsed.data.error ?? `${response.status} ${response.statusText}`)
            : `${response.status} ${response.statusText}`;
        } catch {
          errorMessage = `${response.status} ${response.statusText}`;
        }

        return {
          success: false,
          errorMessage,
        };
      }

      const data = parseWithSchema(
        SmartContractVerifyApiOkResponseSchema,
        await response.json(),
        'Hashscan verify API POST /verify',
      );

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

  async isVerifiedFullMatchOnRepository(
    contractEvmAddress: string,
  ): Promise<boolean> {
    const network = this.networkService.getCurrentNetwork();
    const chainId = NetworkChainMap[network];
    const query = new URLSearchParams({
      addresses: contractEvmAddress,
      chainIds: String(chainId),
    });
    const url = `${HASHSCAN_VERIFY_ORIGIN}/check-by-addresses?${query.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new NetworkError(
          `Hashscan contract verification API returned ${response.status} ${response.statusText}`,
          { recoverable: true },
        );
      }

      const checkByAddressResults = parseWithSchema(
        CheckByAddressesResponseSchema,
        await response.json(),
        'Hashscan verify API GET /check-by-addresses',
      );

      const verificationCheck = checkByAddressResults[0];
      return verificationCheck.status === HASHSCAN_VERIFICATION_STATUS_PERFECT;
    } catch (error) {
      if (error instanceof CliError) {
        throw error;
      }
      throw new NetworkError(
        'Failed to reach Hashscan contract verification API to check verification status.',
        { cause: error, recoverable: true },
      );
    }
  }
}
