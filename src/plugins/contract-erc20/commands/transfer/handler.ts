/**
 * Contract ERC20 transfer Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc20CallTransferOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';

import { ContractErc20CallTransferInputSchema } from './input';

const ERC_20_FUNCTION_NAME = 'transfer';

export async function transferFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

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
    throw new NotFoundError(
      `Couldn't resolve EVM address for an account ${accountToRef.value}`,
      { context: { accountToRef: accountToRef.value } },
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
    throw new TransactionError(
      `Failed to call ${ERC_20_FUNCTION_NAME} function: ${result.receipt?.status?.status ?? 'UNKNOWN'}`,
      false,
      { context: { status: result.receipt?.status?.status } },
    );
  }

  const outputData: ContractErc20CallTransferOutput = {
    contractId: contractInfo.contractId,
    network,
    transactionId: result.transactionId,
  };

  return { result: outputData };
}
