/**
 * Contract ERC20 decimals Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc20CallDecimalsOutput } from '@/plugins/contract-erc20/commands/decimals/output';

import { Interface } from 'ethers';

import { StateError } from '@/core/errors';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { ContractErc20CallDecimalsInputSchema } from '@/plugins/contract-erc20/commands/decimals/input';
import { ContractErc20CallDecimalsResultSchema } from '@/plugins/contract-erc20/commands/decimals/result';
import { ERC20_ABI } from '@/plugins/contract-erc20/shared/erc20-abi';

const ERC_20_FUNCTION_NAME = 'decimals';

export async function decimalsFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = ContractErc20CallDecimalsInputSchema.parse(args.args);
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
    throw new StateError(
      `There was a problem with decoding contract ${contractIdOrEvm} "${ERC_20_FUNCTION_NAME}" function result`,
      { context: { contractIdOrEvm, functionName: ERC_20_FUNCTION_NAME } },
    );
  }

  const decimals = ContractErc20CallDecimalsResultSchema.parse(queryResult[0]);

  const outputData: ContractErc20CallDecimalsOutput = {
    contractId,
    decimals,
    network,
  };

  return { result: outputData };
}
