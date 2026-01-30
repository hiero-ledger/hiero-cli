/**
 * Contract ERC20 symbol Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc20CallSymbolOutput } from '@/plugins/contract-erc20/commands/symbol/output';

import { Interface } from 'ethers';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ContractErc20CallSymbolInputSchema } from '@/plugins/contract-erc20/commands/symbol/input';
import { ERC20_ABI } from '@/plugins/contract-erc20/shared/erc20-abi';

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

    const contractId = api.identifierResolver.resolveEntityId({
      entityIdOrAlias: contractIdOrAlias,
      type: ALIAS_TYPE.Contract,
      network,
    }).entityId;
    const erc20Interface = new Interface(ERC20_ABI);
    const data = erc20Interface.encodeFunctionData(ERC_20_FUNCTION_NAME);

    logger.info(
      `Calling contract ${contractId} "${ERC_20_FUNCTION_NAME}" function on mirror node`,
    );
    const contractInfo = await api.mirror.getContractInfo(contractId);
    if (!contractInfo) {
      throw new Error(`Contract ${contractId} not found`);
    }
    if (!contractInfo.evm_address) {
      throw new Error(`Contract ${contractId} does not have an EVM address`);
    }
    const response = await api.mirror.postContractCall({
      to: contractInfo.evm_address,
      data: data,
    });

    if (!response || !response.result) {
      throw new Error(
        `There was a problem with calling contract ${contractId} "${ERC_20_FUNCTION_NAME}" function`,
      );
    }

    const decodedResult = erc20Interface.decodeFunctionResult(
      ERC_20_FUNCTION_NAME,
      response.result,
    );
    if (!decodedResult || decodedResult.length === 0) {
      throw new Error(
        `There was a problem with decoding contract ${contractId} "${ERC_20_FUNCTION_NAME}" function result`,
      );
    }
    const contractSymbol = ContractErc20CallSymbolResultSchema.parse(
      decodedResult[0],
    );

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
