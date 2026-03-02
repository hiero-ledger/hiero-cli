/**
 * Contract ERC20 balanceOf Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc20CallBalanceOfOutput } from '@/plugins/contract-erc20/commands/balance-of/output';

import { Interface } from 'ethers';

import { NotFoundError, StateError } from '@/core/errors';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { EntityReferenceType } from '@/core/types/shared.types';
import { ContractErc20CallBalanceOfInputSchema } from '@/plugins/contract-erc20/commands/balance-of/input';
import { ContractErc20CallBalanceOfResultSchema } from '@/plugins/contract-erc20/commands/balance-of/result';
import { ERC20_ABI } from '@/plugins/contract-erc20/shared/erc20-abi';

const ERC_20_FUNCTION_NAME = 'balanceOf';

export async function balanceOfFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = ContractErc20CallBalanceOfInputSchema.parse(args.args);
  const contractRef = validArgs.contract;
  const accountRef = validArgs.account;
  const network = api.network.getCurrentNetwork();

  const contractIdOrEvm =
    api.identityResolution.resolveReferenceToEntityOrEvmAddress({
      entityReference: contractRef.value,
      referenceType: contractRef.type,
      network,
      aliasType: ALIAS_TYPE.Contract,
    }).entityIdOrEvmAddress;

  const accountEvmAddress =
    accountRef.type === EntityReferenceType.EVM_ADDRESS
      ? accountRef.value
      : (
          await api.identityResolution.resolveAccount({
            accountReference: accountRef.value,
            type: accountRef.type,
            network,
          })
        ).evmAddress;
  if (!accountEvmAddress) {
    throw new NotFoundError(
      `Couldn't resolve EVM address for an account ${accountRef.value}`,
      { context: { accountRef: accountRef.value } },
    );
  }

  const result = await api.contractQuery.queryContractFunction({
    abiInterface: new Interface(ERC20_ABI),
    contractIdOrEvmAddress: contractIdOrEvm,
    functionName: ERC_20_FUNCTION_NAME,
    args: [accountEvmAddress],
  });
  const queryResult = result.queryResult;
  const contractId = result.contractId;

  if (queryResult.length === 0) {
    throw new StateError(
      `There was a problem with decoding contract ${contractIdOrEvm} "${ERC_20_FUNCTION_NAME}" function result`,
      { context: { contractIdOrEvm, functionName: ERC_20_FUNCTION_NAME } },
    );
  }

  const balance = ContractErc20CallBalanceOfResultSchema.parse(queryResult[0]);

  const outputData: ContractErc20CallBalanceOfOutput = {
    contractId,
    account: accountEvmAddress,
    balance: balance.toString(),
    network,
  };

  return { result: outputData };
}
