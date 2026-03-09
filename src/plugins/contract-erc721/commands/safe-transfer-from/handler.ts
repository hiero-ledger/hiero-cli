import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc721CallSafeTransferFromOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';

import { ContractErc721CallSafeTransferFromInputSchema } from './input';

const ERC_721_FUNCTION_NAME = 'safeTransferFrom';

export async function safeTransferFromFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = ContractErc721CallSafeTransferFromInputSchema.parse(
    args.args,
  );
  const contractRef = validArgs.contract;
  const gas = validArgs.gas;
  const fromRef = validArgs.from;
  const toRef = validArgs.to;
  const tokenId = validArgs.tokenId;
  const data = validArgs.data;
  const network = api.network.getCurrentNetwork();

  const contractInfo = await api.identityResolution.resolveContract({
    contractReference: contractRef.value,
    type: contractRef.type,
    network,
  });

  let fromEvmAddress: string | undefined;
  if (fromRef.type === EntityReferenceType.EVM_ADDRESS) {
    fromEvmAddress = fromRef.value;
  } else {
    const accountInfo = await api.identityResolution.resolveAccount({
      accountReference: fromRef.value,
      type: fromRef.type,
      network,
    });
    fromEvmAddress = accountInfo.evmAddress;
  }

  if (!fromEvmAddress) {
    throw new NotFoundError(
      `Couldn't resolve EVM address for an account ${fromRef.value}`,
      { context: { accountRef: fromRef.value } },
    );
  }

  let toEvmAddress: string | undefined;
  if (toRef.type === EntityReferenceType.EVM_ADDRESS) {
    toEvmAddress = toRef.value;
  } else {
    const accountInfo = await api.identityResolution.resolveAccount({
      accountReference: toRef.value,
      type: toRef.type,
      network,
    });
    toEvmAddress = accountInfo.evmAddress;
  }

  if (!toEvmAddress) {
    throw new NotFoundError(
      `Couldn't resolve EVM address for an account ${toRef.value}`,
      { context: { accountRef: toRef.value } },
    );
  }

  const functionParameters: ContractFunctionParameters =
    new ContractFunctionParameters()
      .addAddress(fromEvmAddress)
      .addAddress(toEvmAddress)
      .addUint256(tokenId);

  if (data) {
    functionParameters.addBytes(Buffer.from(data.slice(2), 'hex'));
  }

  const contractCallTransaction = api.contract.contractExecuteTransaction({
    contractId: contractInfo.contractId,
    gas,
    functionName: ERC_721_FUNCTION_NAME,
    functionParameters,
  });
  const bytes = await api.txSign.sign(contractCallTransaction.transaction, []);
  const result = await api.txExecute.executeBytes(bytes);

  if (!result.success) {
    throw new TransactionError(
      `Failed to call ${ERC_721_FUNCTION_NAME} on contract ${contractInfo.contractId} (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
      false,
      {
        context: { contractId: contractInfo.contractId },
        cause: result.receipt,
      },
    );
  }

  const outputData: ContractErc721CallSafeTransferFromOutput = {
    contractId: contractInfo.contractId,
    network,
    transactionId: result.transactionId,
  };

  return { result: outputData };
}
