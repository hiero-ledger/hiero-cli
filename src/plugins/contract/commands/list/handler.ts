import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ContractListOutput } from './output';

import { ContractStateServiceImpl } from '@/plugins/contract/services/contract-state.service';
import { type ContractStateService } from '@/plugins/contract/services/contract-state.service.interface';

export class ListContractsCommand implements Command {
  constructor(private readonly contractState: ContractStateService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const contracts = this.contractState.listContracts();
    api.logger.debug(
      `[CONTRACT LIST] Retrieved ${contracts.length} contracts from state`,
    );

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
  const contractState = new ContractStateServiceImpl(
    args.api.state,
    args.api.logger,
  );
  return new ListContractsCommand(contractState).execute(args);
}
