import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc721CallIsApprovedForAllOutput } from '@/plugins/contract-erc721/commands/is-approved-for-all/output';

import { Interface } from 'ethers';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { EntityReferenceType } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';
import { ContractErc721CallIsApprovedForAllInputSchema } from '@/plugins/contract-erc721/commands/is-approved-for-all/input';
import { ContractErc721CallIsApprovedForAllResultSchema } from '@/plugins/contract-erc721/commands/is-approved-for-all/result';
import { ERC721_ABI } from '@/plugins/contract-erc721/shared/erc721-abi';

const ERC_721_FUNCTION_NAME = 'isApprovedForAll';

export async function isApprovedForAllFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;
  try {
    const validArgs = ContractErc721CallIsApprovedForAllInputSchema.parse(
      args.args,
    );
    const contractRef = validArgs.contract;
    const ownerRef = validArgs.owner;
    const operatorRef = validArgs.operator;
    const network = api.network.getCurrentNetwork();

    const contractIdOrEvm =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: contractRef.value,
        referenceType: contractRef.type,
        network,
        aliasType: ALIAS_TYPE.Contract,
      }).entityIdOrEvmAddress;

    let ownerEvmAddress: string | undefined;
    if (ownerRef.type === EntityReferenceType.EVM_ADDRESS) {
      ownerEvmAddress = ownerRef.value;
    } else {
      const accountInfo = await api.identityResolution.resolveAccount({
        accountReference: ownerRef.value,
        type: ownerRef.type,
        network,
      });
      ownerEvmAddress = accountInfo.evmAddress;
    }

    if (!ownerEvmAddress) {
      throw new Error(
        `Couldn't resolve EVM address for an account ${ownerRef.value}`,
      );
    }

    let operatorEvmAddress: string | undefined;
    if (operatorRef.type === EntityReferenceType.EVM_ADDRESS) {
      operatorEvmAddress = operatorRef.value;
    } else {
      const accountInfo = await api.identityResolution.resolveAccount({
        accountReference: operatorRef.value,
        type: operatorRef.type,
        network,
      });
      operatorEvmAddress = accountInfo.evmAddress;
    }

    if (!operatorEvmAddress) {
      throw new Error(
        `Couldn't resolve EVM address for an account ${operatorRef.value}`,
      );
    }

    const result = await api.contractQuery.queryContractFunction({
      abiInterface: new Interface(ERC721_ABI),
      contractIdOrEvmAddress: contractIdOrEvm,
      functionName: ERC_721_FUNCTION_NAME,
      args: [ownerEvmAddress, operatorEvmAddress],
    });

    const queryResult = result.queryResult;
    const contractId = result.contractId;

    if (queryResult.length === 0) {
      throw new Error(
        `There was a problem with decoding contract ${contractIdOrEvm} "${ERC_721_FUNCTION_NAME}" function result`,
      );
    }

    const isApprovedForAll =
      ContractErc721CallIsApprovedForAllResultSchema.parse(queryResult[0]);

    const outputData: ContractErc721CallIsApprovedForAllOutput = {
      contractId,
      owner: ownerEvmAddress,
      operator: operatorEvmAddress,
      isApprovedForAll,
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
