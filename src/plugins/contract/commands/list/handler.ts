/**
 * Contract List Command Handler
 * Handles listing all deployed contracts from state for all networks
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractListOutput } from '@/plugins/contract/commands/list/output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

export async function listContracts(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const contractState = new ZustandContractStateHelper(api.state, logger);

  logger.info('Listing contracts...');

  try {
    const contracts = contractState.listContracts();
    logger.debug(
      `[CONTRACT LIST] Retrieved ${contracts.length} contracts from state`,
    );

    contracts.forEach((contract, index) => {
      logger.debug(
        `[CONTRACT LIST]   ${index + 1}. ${contract.contractName} - ${contract.contractId} on ${contract.network}`,
      );
    });

    const contractAliases = contracts.map((contract) => {
      const alias = api.alias.resolve(
        contract.contractId,
        'contract',
        contract.network,
      )?.alias;

      return {
        ...contract,
        alias,
      };
    });

    const outputData: ContractListOutput = {
      contracts: contractAliases,
      totalCount: contracts.length,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to list contracts', error),
    };
  }
}
