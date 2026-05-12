/**
 * Contract ERC20 balanceOf Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ContractErc20CallBalanceOfOutput } from '@/plugins/contract-erc20/commands/balance-of/output';
import type { ContractErc20BalanceOfNormalizedParams } from './types';

import { Interface } from 'ethers';

import { NotFoundError, StateError } from '@/core/errors';
import { AliasType, EntityReferenceType } from '@/core/types/shared.types';
import { ContractErc20CallBalanceOfInputSchema } from '@/plugins/contract-erc20/commands/balance-of/input';
import { ContractErc20CallBalanceOfResultSchema } from '@/plugins/contract-erc20/commands/balance-of/result';
import { ERC20_ABI } from '@/plugins/contract-erc20/shared/erc20-abi';

const ERC_20_FUNCTION_NAME = 'balanceOf';

export class ContractErc20BalanceOfCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const normalisedParams = await this.normalizeParams(args);

    const result = await api.contractQuery.queryContractFunction({
      abiInterface: new Interface(ERC20_ABI),
      contractIdOrEvmAddress: normalisedParams.contractIdOrEvm,
      functionName: ERC_20_FUNCTION_NAME,
      args: [normalisedParams.accountEvmAddress],
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

    const balance = ContractErc20CallBalanceOfResultSchema.parse(
      queryResult[0],
    );

    const outputData: ContractErc20CallBalanceOfOutput = {
      contractId,
      account: normalisedParams.accountEvmAddress,
      balance: balance.toString(),
      network: normalisedParams.network,
    };

    return { result: outputData };
  }

  private async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ContractErc20BalanceOfNormalizedParams> {
    const { api } = args;

    const validArgs = ContractErc20CallBalanceOfInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();

    const contractIdOrEvm =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: validArgs.contract.value,
        referenceType: validArgs.contract.type,
        network,
        aliasType: AliasType.Contract,
      }).entityIdOrEvmAddress;

    const accountEvmAddress =
      validArgs.account.type === EntityReferenceType.EVM_ADDRESS
        ? validArgs.account.value
        : (
            await api.identityResolution.resolveAccount({
              accountReference: validArgs.account.value,
              type: validArgs.account.type,
              network,
            })
          ).evmAddress;

    if (!accountEvmAddress) {
      throw new NotFoundError(
        `Couldn't resolve EVM address for an account ${validArgs.account.value}`,
        { context: { accountRef: validArgs.account.value } },
      );
    }

    return {
      contractIdOrEvm,
      accountEvmAddress,
      network,
    };
  }
}

export async function contractErc20BalanceOf(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ContractErc20BalanceOfCommand().execute(args);
}
