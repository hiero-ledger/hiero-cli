import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc721CallGetApprovedOutput } from '@/plugins/contract-erc721/commands/get-approved/output';

import { Interface } from 'ethers';

import { StateError } from '@/core/errors';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { ContractErc721CallGetApprovedInputSchema } from '@/plugins/contract-erc721/commands/get-approved/input';
import { ContractErc721CallGetApprovedResultSchema } from '@/plugins/contract-erc721/commands/get-approved/result';
import { ERROR_MESSAGES } from '@/plugins/contract-erc721/error-messages';
import { ERC721_ABI } from '@/plugins/contract-erc721/shared/erc721-abi';

const ERC_721_FUNCTION_NAME = 'getApproved';

export async function getApprovedFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = ContractErc721CallGetApprovedInputSchema.parse(args.args);
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

  const approved = ContractErc721CallGetApprovedResultSchema.parse(
    queryResult[0],
  );

  const approvedAliasRecord = api.alias.resolveByEvmAddress(approved, network);

  const outputData: ContractErc721CallGetApprovedOutput = {
    contractId,
    tokenId,
    approved,
    approvedAlias: approvedAliasRecord?.alias,
    approvedEntityId: approvedAliasRecord?.entityId,
    network,
  };

  return { result: outputData };
}
