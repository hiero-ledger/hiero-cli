/**
 * Contract ERC20 approve Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc20CallApproveOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { EntityReferenceType } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';

import { ContractErc20CallApproveInputSchema } from './input';

const ERC_20_FUNCTION_NAME = 'approve';

export async function approveFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;
  try {
    const validArgs = ContractErc20CallApproveInputSchema.parse(args.args);
    const contractRef = validArgs.contract;
    const gas = validArgs.gas;
    const spenderRef = validArgs.spender;
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

    const spenderIdOrEvm =
      spenderRef.type === EntityReferenceType.ALIAS
        ? api.alias.resolveOrThrow(
            spenderRef.value,
            ALIAS_TYPE.Account,
            network,
          ).entityId
        : spenderRef.value;
    if (!spenderIdOrEvm) {
      throw new Error(
        `Account ${spenderRef.value} is missing an account ID in its alias record`,
      );
    }
    const spenderEvmAddress =
      spenderRef.type === EntityReferenceType.EVM_ADDRESS
        ? spenderIdOrEvm
        : (await api.mirror.getAccount(spenderIdOrEvm)).evmAddress;
    if (!spenderEvmAddress) {
      throw new Error(
        `Couldn't resolve EVM address for an account ${spenderIdOrEvm}`,
      );
    }
    const functionParameters: ContractFunctionParameters =
      new ContractFunctionParameters()
        .addAddress(spenderEvmAddress)
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
    const outputData: ContractErc20CallApproveOutput = {
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
