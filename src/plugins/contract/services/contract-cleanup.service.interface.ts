import type { SupportedNetwork } from '@/core/types/shared.types';
import type { ContractData } from '@/plugins/contract/schema';

export interface ContractCleanupService {
  removeContractFromLocalState(
    contract: ContractData,
    network: SupportedNetwork,
  ): string[];
}
