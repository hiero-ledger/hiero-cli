/**
 * Contract ERC20 allowance Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ContractErc20CallAllowanceOutput } from '@/plugins/contract-erc20/commands/allowance/output';
import type { ContractErc20AllowanceNormalizedParams } from './types';

import { Interface } from 'ethers';

import { NotFoundError, StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { EntityReferenceType } from '@/core/types/shared.types';
import { ContractErc20CallAllowanceInputSchema } from '@/plugins/contract-erc20/commands/allowance/input';
import { ContractErc20CallAllowanceResultSchema } from '@/plugins/contract-erc20/commands/allowance/result';
import { ERC20_ABI } from '@/plugins/contract-erc20/shared/erc20-abi';

const ERC_20_FUNCTION_NAME = 'allowance';

export class ContractErc20AllowanceCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const normalisedParams = await this.normalizeParams(args);

    const result = await api.contractQuery.queryContractFunction({
      abiInterface: new Interface(ERC20_ABI),
      contractIdOrEvmAddress: normalisedParams.contractIdOrEvm,
      functionName: ERC_20_FUNCTION_NAME,
      args: [
        normalisedParams.ownerEvmAddress,
        normalisedParams.spenderEvmAddress,
      ],
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

    const allowanceValue = ContractErc20CallAllowanceResultSchema.parse(
      queryResult[0],
    );

    const outputData: ContractErc20CallAllowanceOutput = {
      contractId,
      owner: normalisedParams.ownerEvmAddress,
      spender: normalisedParams.spenderEvmAddress,
      allowance: String(allowanceValue),
      network: normalisedParams.network,
    };

    return { result: outputData };
  }

  private async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ContractErc20AllowanceNormalizedParams> {
    const { api } = args;

    const validArgs = ContractErc20CallAllowanceInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();

    const contractIdOrEvm =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: validArgs.contract.value,
        referenceType: validArgs.contract.type,
        network,
        aliasType: AliasType.Contract,
      }).entityIdOrEvmAddress;

    const ownerEvmAddress =
      validArgs.owner.type === EntityReferenceType.EVM_ADDRESS
        ? validArgs.owner.value
        : (
            await api.identityResolution.resolveAccount({
              accountReference: validArgs.owner.value,
              type: validArgs.owner.type,
              network,
            })
          ).evmAddress;

    if (!ownerEvmAddress) {
      throw new NotFoundError(
        `Couldn't resolve EVM address for an account ${validArgs.owner.value}`,
        { context: { ownerRef: validArgs.owner.value } },
      );
    }

    const spenderEvmAddress =
      validArgs.spender.type === EntityReferenceType.EVM_ADDRESS
        ? validArgs.spender.value
        : (
            await api.identityResolution.resolveAccount({
              accountReference: validArgs.spender.value,
              type: validArgs.spender.type,
              network,
            })
          ).evmAddress;

    if (!spenderEvmAddress) {
      throw new NotFoundError(
        `Couldn't resolve EVM address for an account ${validArgs.spender.value}`,
        { context: { spenderRef: validArgs.spender.value } },
      );
    }

    return {
      contractIdOrEvm,
      ownerEvmAddress,
      spenderEvmAddress,
      network,
    };
  }
}

export const allowance = (args: CommandHandlerArgs) =>
  new ContractErc20AllowanceCommand().execute(args);
