import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc721CallTokenUriOutput } from '@/plugins/contract-erc721/commands/token-uri/output';

import { Interface } from 'ethers';

import { StateError } from '@/core/errors';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { ContractErc721CallTokenUriInputSchema } from '@/plugins/contract-erc721/commands/token-uri/input';
import { ContractErc721CallTokenUriResultSchema } from '@/plugins/contract-erc721/commands/token-uri/result';
import { ERROR_MESSAGES } from '@/plugins/contract-erc721/error-messages';
import { ERC721_ABI } from '@/plugins/contract-erc721/shared/erc721-abi';

const ERC_721_FUNCTION_NAME = 'tokenURI';

export async function tokenUriFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = ContractErc721CallTokenUriInputSchema.parse(args.args);
  const contractRef = validArgs.contract;
  const tokenId = validArgs.tokenId;
  const network = api.network.getCurrentNetwork();

  const contractIdOrEvm =
    api.identityResolution.resolveReferenceToEntityOrEvmAddress({
      entityReference: contractRef.value,
      referenceType: contractRef.type,
      network,
      aliasType: ALIAS_TYPE.Contract,
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
      ERROR_MESSAGES.contractQueryDecodeError(
        contractIdOrEvm,
        ERC_721_FUNCTION_NAME,
      ),
      { context: { contractIdOrEvm, functionName: ERC_721_FUNCTION_NAME } },
    );
  }

  const tokenURI = ContractErc721CallTokenUriResultSchema.parse(queryResult[0]);

  const outputData: ContractErc721CallTokenUriOutput = {
    contractId,
    tokenId,
    tokenURI,
    network,
  };

  return { result: outputData };
}
