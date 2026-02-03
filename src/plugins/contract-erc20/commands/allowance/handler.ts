/**
 * Contract ERC20 allowance Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc20CallAllowanceOutput } from '@/plugins/contract-erc20/commands/allowance/output';

import { Interface } from 'ethers';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { EntityReferenceType } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';
import { ContractErc20CallAllowanceInputSchema } from '@/plugins/contract-erc20/commands/allowance/input';
import { ContractErc20CallAllowanceResultSchema } from '@/plugins/contract-erc20/commands/allowance/result';
import { ERC20_ABI } from '@/plugins/contract-erc20/shared/erc20-abi';

const ERC_20_FUNCTION_NAME = 'allowance';

export async function allowanceFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;
  try {
    const validArgs = ContractErc20CallAllowanceInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const ownerRef = validArgs.owner;
    const spenderRef = validArgs.spender;
    const network = api.network.getCurrentNetwork();

    const contractIdOrEvm =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: contractRef.value,
        referenceType: contractRef.type,
        network,
        aliasType: ALIAS_TYPE.Contract,
      }).entityIdOrEvmAddress;

    const ownerEvmAddress =
      ownerRef.type === EntityReferenceType.EVM_ADDRESS
        ? ownerRef.value
        : (
            await api.identityResolution.resolveAccount({
              accountReference: ownerRef.value,
              type: ownerRef.type,
              network,
            })
          ).evmAddress;

    if (!ownerEvmAddress) {
      throw new Error(
        `Couldn't resolve EVM address for an account ${ownerRef.value}`,
      );
    }

    const spenderEvmAddress =
      spenderRef.type === EntityReferenceType.EVM_ADDRESS
        ? spenderRef.value
        : (
            await api.identityResolution.resolveAccount({
              accountReference: spenderRef.value,
              type: spenderRef.type,
              network,
            })
          ).evmAddress;

    if (!spenderEvmAddress) {
      throw new Error(
        `Couldn't resolve EVM address for an account ${spenderRef.value}`,
      );
    }

    const result = await api.contractQuery.queryContractFunction({
      abiInterface: new Interface(ERC20_ABI),
      contractIdOrEvmAddress: contractIdOrEvm,
      functionName: ERC_20_FUNCTION_NAME,
      args: [ownerEvmAddress, spenderEvmAddress],
    });
    const queryResult = result.queryResult;
    const contractId = result.contractId;
    if (queryResult.length === 0) {
      throw new Error(
        `There was a problem with decoding contract ${contractIdOrEvm} "${ERC_20_FUNCTION_NAME}" function result`,
      );
    }
    const allowanceValue = ContractErc20CallAllowanceResultSchema.parse(
      queryResult[0],
    );

    const outputData: ContractErc20CallAllowanceOutput = {
      contractId,
      owner: ownerEvmAddress,
      spender: spenderEvmAddress,
      allowance: String(allowanceValue),
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
