import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ContractErc721CallOwnerOfOutput } from '@/plugins/contract-erc721/commands/owner-of/output';

import { Interface } from 'ethers';

import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { ContractErc721CallOwnerOfInputSchema } from '@/plugins/contract-erc721/commands/owner-of/input';
import { ContractErc721CallOwnerOfResultSchema } from '@/plugins/contract-erc721/commands/owner-of/result';
import { ERC721_ABI } from '@/plugins/contract-erc721/shared/erc721-abi';

const ERC_721_FUNCTION_NAME = 'ownerOf';

export class ContractErc721OwnerOfCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = ContractErc721CallOwnerOfInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const tokenId = validArgs.tokenId;
    const network = api.network.getCurrentNetwork();

    const contractIdOrEvm =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: contractRef.value,
        referenceType: contractRef.type,
        network,
        aliasType: AliasType.Contract,
      }).entityIdOrEvmAddress;

    const result = await api.contractQuery.queryContractFunction({
      abiInterface: new Interface(ERC721_ABI),
      contractIdOrEvmAddress: contractIdOrEvm,
      functionName: ERC_721_FUNCTION_NAME,
      args: [tokenId],
    });
    const queryResult = result.queryResult;
    const contractId = result.contractId;

    if (queryResult.length === 0) {
      throw new StateError(
        `There was a problem with decoding contract ${contractIdOrEvm} "${ERC_721_FUNCTION_NAME}" function result`,
        { context: { contractIdOrEvm, functionName: ERC_721_FUNCTION_NAME } },
      );
    }

    const owner = ContractErc721CallOwnerOfResultSchema.parse(queryResult[0]);

    const ownerAlias = api.alias.resolveByEvmAddress(owner, network);

    const outputData: ContractErc721CallOwnerOfOutput = {
      contractId,
      owner,
      ownerAlias: ownerAlias?.alias,
      ownerEntityId: ownerAlias?.entityId,
      network,
    };

    return { result: outputData };
  }
}

export async function contractErc721OwnerOf(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ContractErc721OwnerOfCommand().execute(args);
}
