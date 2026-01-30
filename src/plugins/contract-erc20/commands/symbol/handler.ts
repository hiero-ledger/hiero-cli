/**
 * Contract ERC20 symbol Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc20CallSymbolOutput } from '@/plugins/contract-erc20/commands/symbol/output';

import { ContractId } from '@hashgraph/sdk';

import { Status } from '@/core/shared/constants';
import { resolveContractId } from '@/core/utils/contract-resolver';
import { formatError } from '@/core/utils/errors';
import { getAbiErc20Interface } from '@/plugins/contract-erc20/utils/erc20-abi-resolver';

import { ContractErc20CallSymbolInputSchema } from './input';

const ERC_20_FUNCTION_NAME = 'symbol';

export async function symbol(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;
  try {
    const validArgs = ContractErc20CallSymbolInputSchema.parse(args.args);
    const contract = validArgs.contract;

    const network = api.network.getCurrentNetwork();

    const contractId = resolveContractId(contract, api.alias, network);
    logger.info(
      `Calling ERC-20 "symbol" function on contract ${contractId} (network: ${network})`,
    );
    const erc20Interface = getAbiErc20Interface();
    const data = erc20Interface.encodeFunctionData(ERC_20_FUNCTION_NAME);

    const response = await api.mirror.postContractCall({
      to: `0x${ContractId.fromString(contractId).toEvmAddress()}`,
      data: data,
    });

    if (!response || !response.result) {
      throw new Error(
        `There was a problem with calling contract ${contractId} "symbol" function`,
      );
    }
    const decodedParameter = erc20Interface.decodeFunctionResult(
      ERC_20_FUNCTION_NAME,
      response.result,
    );
    if (!decodedParameter || !decodedParameter[0]) {
      throw new Error(
        `There was a problem with decoding contract ${contractId} "symbol" function result`,
      );
    }
    const contractSymbol = String(decodedParameter[0]);

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
      errorMessage: formatError('Failed to call "symbol" function', error),
    };
  }
}
