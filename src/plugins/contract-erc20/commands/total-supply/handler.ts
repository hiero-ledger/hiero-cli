/**
 * Contract ERC20 totalSupply Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc20CallTotalSupplyOutput } from './output';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { ContractType } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';

import { ContractErc20CallTotalSupplyInputSchema } from './input';
import { ContractErc20CallTotalSupplyResultSchema } from './result';

const ERC_20_FUNCTION_NAME = 'totalSupply';

export async function totalSupplyFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;
  try {
    const validArgs = ContractErc20CallTotalSupplyInputSchema.parse(args.args);
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
    const totalSupplyBigInt =
      ContractErc20CallTotalSupplyResultSchema.parse(result);

    const outputData: ContractErc20CallTotalSupplyOutput = {
      contractId,
      totalSupply: totalSupplyBigInt.toString(),
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
