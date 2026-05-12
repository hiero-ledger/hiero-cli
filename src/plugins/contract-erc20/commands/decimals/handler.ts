/**
 * Contract ERC20 decimals Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ContractErc20CallDecimalsOutput } from '@/plugins/contract-erc20/commands/decimals/output';
import type { ContractErc20DecimalsNormalizedParams } from './types';

import { Interface } from 'ethers';

import { StateError } from '@/core/errors';
import { AliasType } from '@/core/types/shared.types';
import { ContractErc20CallDecimalsInputSchema } from '@/plugins/contract-erc20/commands/decimals/input';
import { ContractErc20CallDecimalsResultSchema } from '@/plugins/contract-erc20/commands/decimals/result';
import { ERC20_ABI } from '@/plugins/contract-erc20/shared/erc20-abi';

const ERC_20_FUNCTION_NAME = 'decimals';

export class ContractErc20DecimalsCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const normalisedParams = this.normalizeParams(args);

    const result = await api.contractQuery.queryContractFunction({
      abiInterface: new Interface(ERC20_ABI),
      contractIdOrEvmAddress: normalisedParams.contractIdOrEvm,
      functionName: ERC_20_FUNCTION_NAME,
    });
    const queryResult = result.queryResult;
    const contractId = result.contractId;

    if (queryResult.length === 0) {
      throw new StateError(
        `There was a problem with decoding contract ${normalisedParams.contractIdOrEvm} "${ERC_20_FUNCTION_NAME}" function result`,
        {
          context: {
            contractIdOrEvm: normalisedParams.contractIdOrEvm,
            functionName: ERC_20_FUNCTION_NAME,
          },
        },
      );
    }

    const decimals = ContractErc20CallDecimalsResultSchema.parse(
      queryResult[0],
    );

    const outputData: ContractErc20CallDecimalsOutput = {
      contractId,
      decimals,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }

  private normalizeParams(
    args: CommandHandlerArgs,
  ): ContractErc20DecimalsNormalizedParams {
    const { api } = args;

    const validArgs = ContractErc20CallDecimalsInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();

    const contractIdOrEvm =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: validArgs.contract.value,
        referenceType: validArgs.contract.type,
        network,
        aliasType: AliasType.Contract,
      }).entityIdOrEvmAddress;

    return {
      contractIdOrEvm,
      network,
    };
  }
}

export async function contractErc20Decimals(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ContractErc20DecimalsCommand().execute(args);
}
