/**
 * Contract ERC20 name Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc20CallTransferOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

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
    const value = validArgs.value;
    const network = api.network.getCurrentNetwork();
    const contractInfo = await api.identityResolution.resolveContract({
      contractReference: contractRef.value,
      type: contractRef.type,
      network,
    });
    const accountToEvmAddress =
      accountToRef.type === EntityReferenceType.EVM_ADDRESS
        ? accountToRef.value
        : (
            await api.identityResolution.resolveAccount({
              accountReference: accountToRef.value,
              type: accountToRef.type,
              network,
            })
          ).evmAddress;

    if (!accountToEvmAddress) {
      throw new Error(
        `Couldn't resolve EVM address for an account ${accountToRef.value}`,
      );
    }
    const functionParameters: ContractFunctionParameters =
      new ContractFunctionParameters()
        .addAddress(accountToEvmAddress)
        .addUint256(value);

    const contractCallTransaction = api.contract.contractExecuteTransaction({
      contractId: contractInfo.contractId,
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
      contractId: contractInfo.contractId,
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
