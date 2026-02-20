/**
 * Contract ERC20 transferFrom Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc20CallTransferFromOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';

import { ContractErc20CallTransferFromInputSchema } from './input';

const ERC_20_FUNCTION_NAME = 'transferFrom';

export async function transferFromFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = ContractErc20CallTransferFromInputSchema.parse(args.args);
  const contractRef = validArgs.contract;
  const gas = validArgs.gas;
  const fromRef = validArgs.from;
  const toRef = validArgs.to;
  const value = validArgs.value;
  const network = api.network.getCurrentNetwork();

  const contractInfo = await api.identityResolution.resolveContract({
    contractReference: contractRef.value,
    type: contractRef.type,
    network,
  });

  const fromEvmAddress =
    fromRef.type === EntityReferenceType.EVM_ADDRESS
      ? fromRef.value
      : (
          await api.identityResolution.resolveAccount({
            accountReference: fromRef.value,
            type: fromRef.type,
            network,
          })
        ).evmAddress;

  if (!fromEvmAddress) {
    throw new NotFoundError(
      `Couldn't resolve EVM address for an account ${fromRef.value}`,
      { context: { fromRef: fromRef.value } },
    );
  }

  const toEvmAddress =
    toRef.type === EntityReferenceType.EVM_ADDRESS
      ? toRef.value
      : (
          await api.identityResolution.resolveAccount({
            accountReference: toRef.value,
            type: toRef.type,
            network,
          })
        ).evmAddress;

  if (!toEvmAddress) {
    throw new NotFoundError(
      `Couldn't resolve EVM address for an account ${toRef.value}`,
      { context: { toRef: toRef.value } },
    );
  }

  const functionParameters: ContractFunctionParameters =
    new ContractFunctionParameters()
      .addAddress(fromEvmAddress)
      .addAddress(toEvmAddress)
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

  const outputData: ContractErc20CallTransferFromOutput = {
    contractId: contractInfo.contractId,
    network,
    transactionId: result.transactionId,
  };

  return { result: outputData };
}
