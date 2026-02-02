/**
 * Contract ERC20 balanceOf Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc20CallBalanceOfOutput } from '@/plugins/contract-erc20/commands/balance-of/output';

import { AccountId } from '@hashgraph/sdk';
import { Interface } from 'ethers';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { EntityReferenceType } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';
import { ContractErc20CallBalanceOfInputSchema } from '@/plugins/contract-erc20/commands/balance-of/input';
import { ContractErc20CallBalanceOfResultSchema } from '@/plugins/contract-erc20/commands/balance-of/result';
import { ERC20_ABI } from '@/plugins/contract-erc20/shared/erc20-abi';

const ERC_20_FUNCTION_NAME = 'balanceOf';

function accountRefToEvmAddress(
  accountRef: { type: EntityReferenceType; value: string },
  resolveAccountAlias: (alias: string) => { entityId?: string },
): string {
  if (accountRef.type === EntityReferenceType.EVM_ADDRESS) {
    return accountRef.value;
  }

  const accountId =
    accountRef.type === EntityReferenceType.ALIAS
      ? resolveAccountAlias(accountRef.value).entityId
      : accountRef.value;

  if (!accountId) {
    throw new Error(
      `Account ${accountRef.value} is missing an account ID in its alias record`,
    );
  }

  const evmAddress = AccountId.fromString(accountId).toEvmAddress();
  return evmAddress.startsWith('0x') ? evmAddress : `0x${evmAddress}`;
}

export async function balanceOfFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;
  try {
    const validArgs = ContractErc20CallBalanceOfInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const accountRef = validArgs.account;
    const network = api.network.getCurrentNetwork();

    const contractIdOrEvm =
      contractRef.type === EntityReferenceType.ALIAS
        ? api.alias.resolveOrThrow(
            contractRef.value,
            ALIAS_TYPE.Contract,
            network,
          ).entityId
        : contractRef.value;

    if (!contractIdOrEvm) {
      throw new Error(
        `Contract ${contractRef.value} is missing an contract ID in its alias record`,
      );
    }

    const accountEvmAddress = accountRefToEvmAddress(accountRef, (alias) =>
      api.alias.resolveOrThrow(alias, ALIAS_TYPE.Account, network),
    );

    const result = await api.contractQuery.queryContractFunction({
      abiInterface: new Interface(ERC20_ABI),
      contractIdOrEvmAddress: contractIdOrEvm,
      functionName: ERC_20_FUNCTION_NAME,
      args: [accountEvmAddress],
    });
    const queryResult = result.queryResult;
    const contractId = result.contractId;

    if (queryResult.length === 0) {
      throw new Error(
        `There was a problem with decoding contract ${contractIdOrEvm} "${ERC_20_FUNCTION_NAME}" function result`,
      );
    }

    const balance = ContractErc20CallBalanceOfResultSchema.parse(
      queryResult[0],
    );

    const outputData: ContractErc20CallBalanceOfOutput = {
      contractId,
      account: accountEvmAddress,
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
        `Failed to call ${ERC_20_FUNCTION_NAME} function`,
        error,
      ),
    };
  }
}
