/**
 * Contract ERC20 name Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc20CallTransferOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { EntityReferenceType } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';

import { ContractErc20CallTransferInputSchema } from './input';
const ERC_20_FUNCTION_NAME = 'transfer';

export async function transferFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;
  try {
    const validArgs = ContractErc20CallTransferInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const gas = validArgs.gas;
    const accountToRef = validArgs.to;
    const amount = validArgs.amount;
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
    const contractInfo = await api.mirror.getContractInfo(contractIdOrEvm);
    const contractId = contractInfo.contract_id;

    const accountToIdOrEvm =
      accountToRef.type === EntityReferenceType.ALIAS
        ? api.alias.resolveOrThrow(
            accountToRef.value,
            ALIAS_TYPE.Account,
            network,
          ).entityId
        : accountToRef.value;
    if (!accountToIdOrEvm) {
      throw new Error(
        `Account ${accountToRef.value} is missing an account ID in its alias record`,
      );
    }
    const accountToEvmAddress =
      accountToRef.type === EntityReferenceType.EVM_ADDRESS
        ? accountToIdOrEvm
        : (await api.mirror.getAccount(accountToIdOrEvm)).evmAddress;
    if (!accountToEvmAddress) {
      throw new Error(
        `Couldn't resolve EVM address for an account ${accountToIdOrEvm}`,
      );
    }
    const functionParameters: ContractFunctionParameters =
      new ContractFunctionParameters()
        .addAddress(accountToEvmAddress)
        .addUint256(amount);

    const contractCallTransaction = api.contract.contractExecuteTransaction({
      contractId,
      gas,
      functionName: ERC_20_FUNCTION_NAME,
      functionParameters,
    });
    const result = await api.txExecution.signAndExecute(
      contractCallTransaction.transaction,
    );

    if (!result.success) {
      return {
        status: Status.Failure,
        errorMessage: `Failed to call ${ERC_20_FUNCTION_NAME} function: ${result.receipt?.status?.status ?? 'UNKNOWN'}`,
      };
    }
    const outputData: ContractErc20CallTransferOutput = {
      contractIdOrEvm,
      network,
      transactionId: result.transactionId,
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
