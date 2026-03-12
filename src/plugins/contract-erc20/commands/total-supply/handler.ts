/**
 * Contract ERC20 totalSupply Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ContractErc20CallTotalSupplyOutput } from '@/plugins/contract-erc20/commands/total-supply/output';
import type { ContractErc20TotalSupplyNormalizedParams } from './types';

import { Interface } from 'ethers';

import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { ContractErc20CallTotalSupplyInputSchema } from '@/plugins/contract-erc20/commands/total-supply/input';
import { ContractErc20CallTotalSupplyResultSchema } from '@/plugins/contract-erc20/commands/total-supply/result';
import { ERC20_ABI } from '@/plugins/contract-erc20/shared/erc20-abi';

const ERC_20_FUNCTION_NAME = 'totalSupply';

export class ContractErc20TotalSupplyCommand implements Command {
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

    const totalSupply = ContractErc20CallTotalSupplyResultSchema.parse(
      queryResult[0],
    );

    const outputData: ContractErc20CallTotalSupplyOutput = {
      contractId,
      totalSupply: totalSupply.toString(),
      network: normalisedParams.network,
    };

    return { result: outputData };
  }

  private normalizeParams(
    args: CommandHandlerArgs,
  ): ContractErc20TotalSupplyNormalizedParams {
    const { api } = args;

    const validArgs = ContractErc20CallTotalSupplyInputSchema.parse(args.args);
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

export const totalSupply = (args: CommandHandlerArgs) =>
  new ContractErc20TotalSupplyCommand().execute(args);
