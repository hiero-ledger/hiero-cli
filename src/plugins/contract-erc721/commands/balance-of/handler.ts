import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ContractErc721CallBalanceOfOutput } from '@/plugins/contract-erc721/commands/balance-of/output';

import { Interface } from 'ethers';

import { NotFoundError, StateError } from '@/core/errors';
import { AliasType, EntityReferenceType } from '@/core/types/shared.types';
import { ContractErc721CallBalanceOfInputSchema } from '@/plugins/contract-erc721/commands/balance-of/input';
import { ContractErc721CallBalanceOfResultSchema } from '@/plugins/contract-erc721/commands/balance-of/result';
import { ERC721_ABI } from '@/plugins/contract-erc721/shared/erc721-abi';

const ERC_721_FUNCTION_NAME = 'balanceOf';

export class ContractErc721BalanceOfCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = ContractErc721CallBalanceOfInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const ownerRef = validArgs.owner;
    const network = api.network.getCurrentNetwork();

    const contractIdOrEvm =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: contractRef.value,
        referenceType: contractRef.type,
        network,
        aliasType: AliasType.Contract,
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
      throw new NotFoundError(
        `Couldn't resolve EVM address for an account ${ownerRef.value}`,
        { context: { accountRef: ownerRef.value } },
      );
    }

    const result = await api.contractQuery.queryContractFunction({
      abiInterface: new Interface(ERC721_ABI),
      contractIdOrEvmAddress: contractIdOrEvm,
      functionName: ERC_721_FUNCTION_NAME,
      args: [ownerEvmAddress],
    });
    const queryResult = result.queryResult;
    const contractId = result.contractId;

    if (queryResult.length === 0) {
      throw new StateError(
        `There was a problem with decoding contract ${contractIdOrEvm} "${ERC_721_FUNCTION_NAME}" function result`,
        { context: { contractIdOrEvm, functionName: ERC_721_FUNCTION_NAME } },
      );
    }

    const balance = ContractErc721CallBalanceOfResultSchema.parse(
      queryResult[0],
    );

    const outputData: ContractErc721CallBalanceOfOutput = {
      contractId,
      owner: ownerEvmAddress,
      balance: balance.toString(),
      network,
    };

    return { result: outputData };
  }
}

export async function contractErc721BalanceOf(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ContractErc721BalanceOfCommand().execute(args);
}
