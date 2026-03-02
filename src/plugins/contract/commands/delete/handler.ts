import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { DeleteContractOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

import { DeleteContractInputSchema } from './input';

export async function deleteContract(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const contractState = new ZustandContractStateHelper(api.state, logger);

  logger.info('Deleting contract...');

  const validArgs = DeleteContractInputSchema.parse(args.args);
  const contractRef = validArgs.contract;
  const isEntityId = EntityIdSchema.safeParse(contractRef).success;
  const currentNetwork = api.network.getCurrentNetwork();
  let contractToDelete;

  if (isEntityId) {
    contractToDelete = contractState.getContract(contractRef);
    if (!contractToDelete) {
      throw new NotFoundError(`Contract with ID '${contractRef}' not found`);
    }
  } else {
    const aliasRecord = api.alias.resolve(
      contractRef,
      ALIAS_TYPE.Contract,
      currentNetwork,
    );
    if (!aliasRecord?.entityId) {
      throw new NotFoundError(`Contract with alias '${contractRef}' not found`);
    }
    contractToDelete = contractState.getContract(aliasRecord.entityId);
    if (!contractToDelete) {
      throw new NotFoundError(`Contract with alias '${contractRef}' not found`);
    }
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
