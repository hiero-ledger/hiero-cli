import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc721CallTransferFromOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';
import { ERROR_MESSAGES } from '@/plugins/contract-erc721/error-messages';

import { ContractErc721CallTransferFromInputSchema } from './input';

const ERC_721_FUNCTION_NAME = 'transferFrom';

export async function transferFromFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = ContractErc721CallTransferFromInputSchema.parse(args.args);
  const contractRef = validArgs.contract;
  const gas = validArgs.gas;
  const fromRef = validArgs.from;
  const toRef = validArgs.to;
  const tokenId = validArgs.tokenId;
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
      ERROR_MESSAGES.couldNotResolveEvmAddress(fromRef.value),
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
      ERROR_MESSAGES.couldNotResolveEvmAddress(toRef.value),
      { context: { accountRef: toRef.value } },
    );
  }

  const functionParameters: ContractFunctionParameters =
    new ContractFunctionParameters()
      .addAddress(fromEvmAddress)
      .addAddress(toEvmAddress)
      .addUint256(tokenId);

  const contractCallTransaction = api.contract.contractExecuteTransaction({
    contractId: contractInfo.contractId,
    gas,
    functionName: ERC_721_FUNCTION_NAME,
    functionParameters,
  });
  const result = await api.txExecution.signAndExecute(
    contractCallTransaction.transaction,
  );

  if (!result.success) {
    throw new TransactionError(
      ERROR_MESSAGES.failedToCallFunction(
        ERC_721_FUNCTION_NAME,
        result.receipt?.status?.status ?? 'UNKNOWN',
      ),
      false,
      {
        context: { contractId: contractInfo.contractId },
        cause: result.receipt,
      },
    );
  }

  const outputData: ContractErc721CallTransferFromOutput = {
    contractId: contractInfo.contractId,
    network,
    transactionId: result.transactionId,
  };

  return { result: outputData };
}
