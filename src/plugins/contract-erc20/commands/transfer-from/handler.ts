/**
 * Contract ERC20 transferFrom Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc20CallTransferFromOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { EntityReferenceType } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';

import { ContractErc20CallTransferFromInputSchema } from './input';

const ERC_20_FUNCTION_NAME = 'transferFrom';

export async function transferFromFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;
  try {
    const validArgs = ContractErc20CallTransferFromInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const gas = validArgs.gas;
    const fromRef = validArgs.from;
    const toRef = validArgs.to;
    const value = validArgs.value;
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

    const fromIdOrEvm =
      fromRef.type === EntityReferenceType.ALIAS
        ? api.alias.resolveOrThrow(fromRef.value, ALIAS_TYPE.Account, network)
            .entityId
        : fromRef.value;
    if (!fromIdOrEvm) {
      throw new Error(
        `Account ${fromRef.value} is missing an account ID in its alias record`,
      );
    }
    const fromEvmAddress =
      fromRef.type === EntityReferenceType.EVM_ADDRESS
        ? fromIdOrEvm
        : (await api.mirror.getAccount(fromIdOrEvm)).evmAddress;
    if (!fromEvmAddress) {
      throw new Error(
        `Couldn't resolve EVM address for an account ${fromIdOrEvm}`,
      );
    }

    const toIdOrEvm =
      toRef.type === EntityReferenceType.ALIAS
        ? api.alias.resolveOrThrow(toRef.value, ALIAS_TYPE.Account, network)
            .entityId
        : toRef.value;
    if (!toIdOrEvm) {
      throw new Error(
        `Account ${toRef.value} is missing an account ID in its alias record`,
      );
    }
    const toEvmAddress =
      toRef.type === EntityReferenceType.EVM_ADDRESS
        ? toIdOrEvm
        : (await api.mirror.getAccount(toIdOrEvm)).evmAddress;
    if (!toEvmAddress) {
      throw new Error(
        `Couldn't resolve EVM address for an account ${toIdOrEvm}`,
      );
    }

    const functionParameters: ContractFunctionParameters =
      new ContractFunctionParameters()
        .addAddress(fromEvmAddress)
        .addAddress(toEvmAddress)
        .addUint256(value);

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
    const outputData: ContractErc20CallTransferFromOutput = {
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
