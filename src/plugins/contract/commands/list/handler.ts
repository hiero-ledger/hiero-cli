import type { CommandHandlerArgs } from '@/core';
import type { CommandResult } from '@/core/plugins/plugin.types';
import type { ContractListOutput } from '@/plugins/contract/commands/list/output';

import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

export async function listContracts(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const contractState = new ZustandContractStateHelper(api.state, logger);

  logger.info('Listing contracts...');

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
    return { ...contract, alias };
  });

  const outputData: ContractListOutput = {
    contracts: contractAliases,
    totalCount: contracts.length,
  };

  return { result: outputData };
}
