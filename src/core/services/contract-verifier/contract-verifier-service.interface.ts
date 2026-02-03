import type {
  ContractVerificationParams,
  ContractVerificationResult,
} from '@/core/services/contract-verifier/types';

export interface ContractVerifierService {
  verifyContract(
    params: ContractVerificationParams,
  ): Promise<ContractVerificationResult>;
}
