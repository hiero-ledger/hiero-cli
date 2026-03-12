/**
 * Delete Contract Command Handler
 * Removes contract information from state by contract ID or alias
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { DeleteContractOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

import { DeleteContractInputSchema } from './input';

export class DeleteContractCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const contractState = new ZustandContractStateHelper(api.state, logger);

    logger.info('Deleting contract...');

    const validArgs = DeleteContractInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const isEntityId = EntityIdSchema.safeParse(contractRef).success;
    const currentNetwork = api.network.getCurrentNetwork();
    let contractToDelete;
    let contractKey;

    if (isEntityId) {
      contractKey = composeKey(currentNetwork, contractRef);
    } else {
      const aliasRecord = api.alias.resolve(
        contractRef,
        AliasType.Contract,
        currentNetwork,
      );
      if (!aliasRecord?.entityId) {
        throw new NotFoundError(
          `Contract with alias '${contractRef}' not found`,
        );
      }
      contractKey = composeKey(currentNetwork, aliasRecord.entityId);
    }
    contractToDelete = contractState.getContract(contractKey);
    if (!contractToDelete) {
      throw new NotFoundError(
        `Contract with identifier '${contractRef}' not found`,
      );
    }

    if (contractToDelete.alias) {
      api.alias.remove(contractToDelete.alias, contractToDelete.network);
      logger.info(
        `🧹 Removed alias '${contractToDelete.alias}' on ${currentNetwork}`,
      );
    }

    contractState.deleteContract(contractToDelete.contractId);

    const result: DeleteContractOutput = {
      deletedContract: {
        contractId: contractToDelete.contractId,
        contractName: contractToDelete.contractName,
      },
      network: contractToDelete.network,
    };

    return { result };
  }
}

export async function deleteContract(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new DeleteContractCommand().execute(args);
}
