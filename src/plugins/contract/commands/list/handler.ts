/**
 * List Contracts Command Handler
 * Handles listing all smart contracts stored in the state
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ContractListOutput } from './output';

import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

export class ListContractsCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const contractState = new ZustandContractStateHelper(api.state, logger);

    logger.info('Listing contracts...');

    const contracts = contractState.listContracts();
    logger.debug(
      `[CONTRACT LIST] Retrieved ${contracts.length} contracts from state`,
    );

    contracts.forEach((contract, index) => {
      logger.debug(
        `[CONTRACT LIST]   ${index + 1}. ${contract.name ?? contract.contractId} - ${contract.contractId} on ${contract.network}`,
      );
    });

    const outputData: ContractListOutput = {
      contracts: contracts.map((c) => ({
        contractId: c.contractId,
        name: c.name,
        contractEvmAddress: c.contractEvmAddress,
        network: c.network,
        verified: c.verified ?? false,
        adminKeyPresent: c.adminKeyRefIds.length > 0,
      })),
      totalCount: contracts.length,
    };

    return { result: outputData };
  }
}

export async function contractList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ListContractsCommand().execute(args);
}
