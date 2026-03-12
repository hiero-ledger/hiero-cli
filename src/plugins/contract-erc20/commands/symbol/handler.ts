/**
 * Contract ERC20 symbol Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ContractErc20CallSymbolOutput } from '@/plugins/contract-erc20/commands/symbol/output';
import type { ContractErc20SymbolNormalizedParams } from './types';

import { Interface } from 'ethers';

import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { ContractErc20CallSymbolInputSchema } from '@/plugins/contract-erc20/commands/symbol/input';
import { ContractErc20CallSymbolResultSchema } from '@/plugins/contract-erc20/commands/symbol/result';
import { ERC20_ABI } from '@/plugins/contract-erc20/shared/erc20-abi';

const ERC_20_FUNCTION_NAME = 'symbol';

export class ContractErc20SymbolCommand implements Command {
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

    const contractSymbol = ContractErc20CallSymbolResultSchema.parse(
      queryResult[0],
    );

    const outputData: ContractErc20CallSymbolOutput = {
      contractId,
      contractSymbol,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }

  private normalizeParams(
    args: CommandHandlerArgs,
  ): ContractErc20SymbolNormalizedParams {
    const { api } = args;

    const validArgs = ContractErc20CallSymbolInputSchema.parse(args.args);
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

export async function contractErc20Symbol(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ContractErc20SymbolCommand().execute(args);
}
