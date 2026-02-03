/**
 * Contract ERC20 name Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc20CallNameOutput } from '@/plugins/contract-erc20/commands/name/output';

import { Interface } from 'ethers';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ContractErc20CallNameInputSchema } from '@/plugins/contract-erc20/commands/name/input';
import { ContractErc20CallNameResultSchema } from '@/plugins/contract-erc20/commands/name/result';
import { ERC20_ABI } from '@/plugins/contract-erc20/shared/erc20-abi';
const ERC_20_FUNCTION_NAME = 'name';

export async function nameFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;
  try {
    const validArgs = ContractErc20CallNameInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const network = api.network.getCurrentNetwork();
    const contractIdOrEvm =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: contractRef.value,
        referenceType: contractRef.type,
        network,
        aliasType: ALIAS_TYPE.Contract,
      }).entityIdOrEvmAddress;
    const result = await api.contractQuery.queryContractFunction({
      abiInterface: new Interface(ERC20_ABI),
      contractIdOrEvmAddress: contractIdOrEvm,
      functionName: ERC_20_FUNCTION_NAME,
    });
    const queryResult = result.queryResult;
    const contractId = result.contractId;
    if (queryResult.length === 0) {
      throw new Error(
        `There was a problem with decoding contract ${contractIdOrEvm} "${ERC_20_FUNCTION_NAME}" function result`,
      );
    }
    const contractName = ContractErc20CallNameResultSchema.parse(
      queryResult[0],
    );

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
