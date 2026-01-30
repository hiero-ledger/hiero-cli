/**
 * Contract ERC20 symbol Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc20CallSymbolOutput } from './output';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { ContractType } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';

import { ContractErc20CallSymbolInputSchema } from './input';
import { ContractErc20CallSymbolResultSchema } from './result';

const ERC_20_FUNCTION_NAME = 'symbol';

export async function symbolFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;
  try {
    const validArgs = ContractErc20CallSymbolInputSchema.parse(args.args);
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
    const contractSymbol = ContractErc20CallSymbolResultSchema.parse(result);

    const outputData: ContractErc20CallSymbolOutput = {
      contractId,
      contractSymbol,
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
