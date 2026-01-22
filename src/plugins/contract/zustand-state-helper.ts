/**
 * Contract State Helper for Zustand State Management
 * Provides convenient methods for contract state operations
 */
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';

import { toErrorMessage } from '@/core/utils/errors';

import { type ContractData } from './schema';
// import { CONTRACT_NAMESPACE } from '@/plugins/contract/manifest';

export class ZustandStateHelper {
  private readonly CONTRACT_NAMESPACE = 'contract-contracts';
  private state: StateService;
  private logger: Logger;

  constructor(state: StateService, logger: Logger) {
    this.state = state;
    this.logger = logger;
  }

  /**
   * Save a contract to the state
   */
  saveContract(contractId: string, contractData: ContractData): void {
    try {
      this.logger.debug(
        `[CONTRACT STATE] Saving contract ${contractId} to state`,
      );

      // Use the state service to save data in the contract namespace
      this.state.set(this.CONTRACT_NAMESPACE, contractId, contractData);

      this.logger.debug(
        `[CONTRACT STATE] Successfully saved contract ${contractId}`,
      );
    } catch (error) {
      this.logger.error(
        `[CONTRACT STATE] Failed to save contract ${contractId}: ${toErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get all contracts from the state
   */
  getAllContracts(): Record<string, ContractData> {
    try {
      this.logger.debug(`[CONTRACT STATE] Getting all contracts from state`);

      const allContracts = this.state.list<ContractData>(
        this.CONTRACT_NAMESPACE,
      );
      const contractsMap: Record<string, ContractData> = {};

      // Convert array to record using contract IDs as keys
      allContracts.forEach((contract) => {
        if (contract && contract.contractId) {
          contractsMap[contract.contractId] = contract;
        }
      });

      this.logger.debug(
        `[CONTRACT STATE] Found ${Object.keys(contractsMap).length} contracts in state`,
      );
      return contractsMap;
    } catch (error) {
      this.logger.error(
        `[CONTRACT STATE] Failed to get all contracts: ${toErrorMessage(error)}`,
      );
      throw error;
    }
  }
}
