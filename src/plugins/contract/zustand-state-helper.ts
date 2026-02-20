/**
 * Contract State Helper for Zustand State Management
 * Provides convenient methods for contract state operations
 */
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';

import { toErrorMessage } from '@/core/utils/errors';
import { CONTRACT_NAMESPACE } from '@/plugins/contract/manifest';

import { type ContractData } from './schema';

export class ZustandContractStateHelper {
  private state: StateService;
  private logger: Logger;

  constructor(state: StateService, logger: Logger) {
    this.state = state;
    this.logger = logger;
  }

  /**
   * Check if a contract exists in the state
   */
  hasContract(contractId: string): boolean {
    return this.state.has(CONTRACT_NAMESPACE, contractId);
  }

  /**
   * Get a contract from the state by contract ID
   */
  getContract(contractId: string): ContractData | undefined {
    return this.state.get<ContractData>(CONTRACT_NAMESPACE, contractId);
  }

  /**
   * Delete a contract from the state
   */
  deleteContract(contractId: string): void {
    try {
      this.logger.debug(
        `[CONTRACT STATE] Deleting contract ${contractId} from state`,
      );
      this.state.delete(CONTRACT_NAMESPACE, contractId);
      this.logger.debug(
        `[CONTRACT STATE] Successfully deleted contract ${contractId}`,
      );
    } catch (error) {
      this.logger.error(
        `[CONTRACT STATE] Failed to delete contract ${contractId}: ${toErrorMessage(error)}`,
      );
      throw error;
    }
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
      this.state.set(CONTRACT_NAMESPACE, contractId, contractData);

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
   * List all contracts with validation
   */
  listContracts(): ContractData[] {
    try {
      this.logger.debug(`[CONTRACT STATE] Listing all contracts`);

      const contracts = this.state.list<ContractData>(CONTRACT_NAMESPACE);
      this.logger.debug(
        `[CONTRACT STATE] Retrieved ${contracts.length} contracts from state`,
      );

      // Log each contract for debugging
      contracts.forEach((contract, index) => {
        if (contract && contract.contractId) {
          this.logger.debug(
            `[CONTRACT STATE]   ${index + 1}. ${contract.contractName} - ${contract.contractId} on ${contract.network}`,
          );
        } else {
          this.logger.debug(
            `[CONTRACT STATE]   ${index + 1}. Invalid contract data: ${JSON.stringify(contract)}`,
          );
        }
      });

      // Filter and return only valid contracts
      const validContracts = contracts.filter((contractData) => {
        if (!contractData || !contractData.contractId) {
          this.logger.warn(
            `[CONTRACT STATE] Skipping invalid contract data (missing contractId)`,
          );
          return false;
        }
        return true;
      });

      this.logger.debug(
        `[CONTRACT STATE] Returning ${validContracts.length} valid contracts`,
      );
      return validContracts;
    } catch (error) {
      this.logger.error(
        `[CONTRACT STATE] Failed to list contracts: ${toErrorMessage(error)}`,
      );
      throw error;
    }
  }
}
