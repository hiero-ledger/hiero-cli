/**
 * Contract ERC20 approve Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc20CallApproveOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';

import { ContractErc20CallApproveInputSchema } from './input';

const ERC_20_FUNCTION_NAME = 'approve';

export async function approveFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = ContractErc20CallApproveInputSchema.parse(args.args);
  const contractRef = validArgs.contract;
  const gas = validArgs.gas;
  const spenderRef = validArgs.spender;
  const value = validArgs.value;
  const network = api.network.getCurrentNetwork();

  const contractInfo = await api.identityResolution.resolveContract({
    contractReference: contractRef.value,
    type: contractRef.type,
    network,
  });

  const spenderEvmAddress =
    spenderRef.type === EntityReferenceType.EVM_ADDRESS
      ? spenderRef.value
      : (
          await api.identityResolution.resolveAccount({
            accountReference: spenderRef.value,
            type: spenderRef.type,
            network,
          })
        ).evmAddress;

  if (!spenderEvmAddress) {
    throw new NotFoundError(
      `Couldn't resolve EVM address for an account ${spenderRef.value}`,
      { context: { spenderRef: spenderRef.value } },
    );
  }

  const functionParameters: ContractFunctionParameters =
    new ContractFunctionParameters()
      .addAddress(spenderEvmAddress)
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
    throw new TransactionError(
      `Failed to call ${ERC_20_FUNCTION_NAME} function: ${result.receipt?.status?.status ?? 'UNKNOWN'}`,
      false,
      { context: { status: result.receipt?.status?.status } },
    );
  }

  const outputData: ContractErc20CallApproveOutput = {
    contractId: contractInfo.contractId,
    network,
    transactionId: result.transactionId,
  };

  return { result: outputData };
}
