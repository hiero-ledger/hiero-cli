import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc721CallSetApprovalForAllOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';
import { ERROR_MESSAGES } from '@/plugins/contract-erc721/error-messages';

import { ContractErc721CallSetApprovalForAllInputSchema } from './input';

const ERC_721_FUNCTION_NAME = 'setApprovalForAll';

export async function setApprovalForAllFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = ContractErc721CallSetApprovalForAllInputSchema.parse(
    args.args,
  );
  const contractRef = validArgs.contract;
  const gas = validArgs.gas;
  const operatorRef = validArgs.operator;
  const approved = validArgs.approved;
  const network = api.network.getCurrentNetwork();

  const contractInfo = await api.identityResolution.resolveContract({
    contractReference: contractRef.value,
    type: contractRef.type,
    network,
  });

  let operatorEvmAddress: string | undefined;
  if (operatorRef.type === EntityReferenceType.EVM_ADDRESS) {
    operatorEvmAddress = operatorRef.value;
  } else {
    const accountInfo = await api.identityResolution.resolveAccount({
      accountReference: operatorRef.value,
      type: operatorRef.type,
      network,
    });
    operatorEvmAddress = accountInfo.evmAddress;
  }

  if (!operatorEvmAddress) {
    throw new NotFoundError(
      ERROR_MESSAGES.couldNotResolveEvmAddress(operatorRef.value),
      { context: { accountRef: operatorRef.value } },
    );
  }

  const functionParameters: ContractFunctionParameters =
    new ContractFunctionParameters()
      .addAddress(operatorEvmAddress)
      .addBool(approved);

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

  const outputData: ContractErc721CallSetApprovalForAllOutput = {
    contractId: contractInfo.contractId,
    network,
    transactionId: result.transactionId,
  };

  return { result: outputData };
}
