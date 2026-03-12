/**
 * Contract ERC20 name Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ContractErc20CallNameOutput } from '@/plugins/contract-erc20/commands/name/output';
import type { ContractErc20NameNormalizedParams } from './types';

import { Interface } from 'ethers';

import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { ContractErc20CallNameInputSchema } from '@/plugins/contract-erc20/commands/name/input';
import { ContractErc20CallNameResultSchema } from '@/plugins/contract-erc20/commands/name/result';
import { ERC20_ABI } from '@/plugins/contract-erc20/shared/erc20-abi';

const ERC_20_FUNCTION_NAME = 'name';

export class ContractErc20NameCommand implements Command {
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

    const name = ContractErc20CallNameResultSchema.parse(queryResult[0]);

    const outputData: ContractErc20CallNameOutput = {
      contractId,
      contractName: name,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }

  private normalizeParams(
    args: CommandHandlerArgs,
  ): ContractErc20NameNormalizedParams {
    const { api } = args;

    const validArgs = ContractErc20CallNameInputSchema.parse(args.args);
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

export const name = (args: CommandHandlerArgs) =>
  new ContractErc20NameCommand().execute(args);
