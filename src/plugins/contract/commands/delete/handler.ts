import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { DeleteContractOutput } from './output';

import { EntityIdSchema } from '@/core/schemas';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

import { DeleteContractInputSchema } from './input';

export async function deleteContract(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const contractState = new ZustandContractStateHelper(api.state, logger);

  logger.info('Deleting contract...');

  try {
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
        ALIAS_TYPE.Contract,
        currentNetwork,
      );
      if (!aliasRecord?.entityId) {
        throw new Error(`Contract with alias '${contractRef}' not found`);
      }
      contractKey = composeKey(currentNetwork, aliasRecord.entityId);
    }
    contractToDelete = contractState.getContract(contractKey);
    if (!contractToDelete) {
      throw new Error(`Contract '${contractRef}' not found`);
    }

    if (contractToDelete.alias) {
      api.alias.remove(contractToDelete.alias, contractToDelete.network);
      logger.info(
        `🧹 Removed alias '${contractToDelete.alias}' on ${currentNetwork}`,
      );
    }

    // Delete contract from state
    contractState.deleteContract(contractToDelete.contractId);

    // Prepare output data
    const outputData: DeleteContractOutput = {
      deletedContract: {
        contractId: contractToDelete.contractId,
        contractName: contractToDelete.contractName,
      },
      network: contractToDelete.network,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to delete contract', error),
    };
  }
}
