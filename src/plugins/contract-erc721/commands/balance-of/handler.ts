/**
 * Contract ERC721 balanceOf Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc721CallBalanceOfOutput } from '@/plugins/contract-erc721/commands/balance-of/output';

import { Interface } from 'ethers';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { EntityReferenceType } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';
import { ContractErc721CallBalanceOfInputSchema } from '@/plugins/contract-erc721/commands/balance-of/input';
import { ContractErc721CallBalanceOfResultSchema } from '@/plugins/contract-erc721/commands/balance-of/result';
import { ERC721_ABI } from '@/plugins/contract-erc721/shared/erc721-abi';

const ERC_721_FUNCTION_NAME = 'balanceOf';

export async function balanceOfFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;
  try {
    const validArgs = ContractErc721CallBalanceOfInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const ownerRef = validArgs.owner;
    const network = api.network.getCurrentNetwork();

    const contractIdOrEvm =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: contractRef.value,
        referenceType: contractRef.type,
        network,
        aliasType: ALIAS_TYPE.Contract,
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
      throw new Error(
        `Couldn't resolve EVM address for an account ${ownerRef.value}`,
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
      throw new Error(
        `There was a problem with decoding contract ${contractIdOrEvm} "${ERC_721_FUNCTION_NAME}" function result`,
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
