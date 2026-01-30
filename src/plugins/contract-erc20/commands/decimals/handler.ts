/**
 * Contract ERC20 decimals Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc20CallDecimalsOutput } from '@/plugins/contract-erc20/commands/decimals/output';

import { ContractId } from '@hashgraph/sdk';

import { Status } from '@/core/shared/constants';
import { resolveContractId } from '@/core/utils/contract-resolver';
import { formatError } from '@/core/utils/errors';
import { getAbiErc20Interface } from '@/plugins/contract-erc20/utils/erc20-abi-resolver';

import { ContractErc20CallDecimalsInputSchema } from './input';

const ERC_20_FUNCTION_NAME = 'decimals';

export async function decimals(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;
  try {
    const validArgs = ContractErc20CallDecimalsInputSchema.parse(args.args);
    const contract = validArgs.contract;

    const network = api.network.getCurrentNetwork();

    const contractId = resolveContractId(contract, api.alias, network);
    logger.info(
      `Calling ERC-20 "decimals" function on contract ${contractId} (network: ${network})`,
    );
    const erc20Interface = getAbiErc20Interface();
    const data = erc20Interface.encodeFunctionData(ERC_20_FUNCTION_NAME);

    const response = await api.mirror.postContractCall({
      to: `0x${ContractId.fromString(contractId).toEvmAddress()}`,
      data: data,
    });

    if (!response || !response.result) {
      throw new Error(
        `There was a problem with calling contract ${contractId} "decimals" function`,
      );
    }
    const decodedParameter = erc20Interface.decodeFunctionResult(
      ERC_20_FUNCTION_NAME,
      response.result,
    );
    if (!decodedParameter || !decodedParameter[0]) {
      throw new Error(
        `There was a problem with decoding contract ${contractId} "decimals" function result`,
      );
    }
    const decimalsValue = String(decodedParameter[0]);

    const outputData: ContractErc20CallDecimalsOutput = {
      contractId,
      decimals: decimalsValue,
      network,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to call "decimals" function', error),
    };
  }
}
