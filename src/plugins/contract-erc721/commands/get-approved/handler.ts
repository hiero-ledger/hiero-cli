import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc721CallGetApprovedOutput } from '@/plugins/contract-erc721/commands/get-approved/output';

import { Interface } from 'ethers';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ContractErc721CallGetApprovedInputSchema } from '@/plugins/contract-erc721/commands/get-approved/input';
import { ContractErc721CallGetApprovedResultSchema } from '@/plugins/contract-erc721/commands/get-approved/result';
import { ERC721_ABI } from '@/plugins/contract-erc721/shared/erc721-abi';

const ERC_721_FUNCTION_NAME = 'getApproved';

export async function getApprovedFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;
  try {
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
      throw new Error(
        `There was a problem with decoding contract ${contractIdOrEvm} "${ERC_721_FUNCTION_NAME}" function result`,
      );
    }

    const approved = ContractErc721CallGetApprovedResultSchema.parse(
      queryResult[0],
    );

    const approvedAliasRecord = api.alias.resolveByEvmAddress(
      approved,
      network,
    );

    const outputData: ContractErc721CallGetApprovedOutput = {
      contractId,
      tokenId,
      approved,
      approvedAlias: approvedAliasRecord?.alias,
      approvedEntityId: approvedAliasRecord?.entityId,
      network,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError(
        `Failed to call ${ERC_721_FUNCTION_NAME} function`,
        error,
      ),
    };
  }
}
