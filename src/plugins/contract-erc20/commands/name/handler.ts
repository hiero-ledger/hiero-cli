/**
 * Contract ERC20 name Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc20CallNameOutput } from '@/plugins/contract-erc20/commands/name/output';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { ContractType } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';

import { ContractErc20CallNameInputSchema } from './input';
import { ContractErc20CallNameResultSchema } from './result';

const ERC_20_FUNCTION_NAME = 'name';

export async function nameFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;
  try {
    const validArgs = ContractErc20CallNameInputSchema.parse(args.args);
    const contractIdOrAlias = validArgs.contract;
    const network = api.network.getCurrentNetwork();

    const contractId = api.alias.resolveEntityId(
      contractIdOrAlias,
      ALIAS_TYPE.Contract,
      network,
    );

    logger.info(
      `Calling ERC-20 ${ERC_20_FUNCTION_NAME} function on contract ${contractId} (network: ${network})`,
    );
    const result = await api.contractCall.callMirrorNodeFunction({
      contractType: ContractType.ERC20,
      functionName: ERC_20_FUNCTION_NAME,
      contractId: contractId,
      args: [],
    });
    const contractName = ContractErc20CallNameResultSchema.parse(result);

    const outputData: ContractErc20CallNameOutput = {
      contractId,
      contractName,
      network,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError(
        `Failed to call ${ERC_20_FUNCTION_NAME} function`,
        error,
      ),
    };
  }
}
