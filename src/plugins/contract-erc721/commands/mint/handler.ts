import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc721CallMintOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';
import { ERROR_MESSAGES } from '@/plugins/contract-erc721/error-messages';

import { ContractErc721CallMintInputSchema } from './input';

const ERC_721_FUNCTION_NAME = 'mint';

export async function mintFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = ContractErc721CallMintInputSchema.parse(args.args);
  const contractRef = validArgs.contract;
  const gas = validArgs.gas;
  const toRef = validArgs.to;
  const tokenId = validArgs.tokenId;
  const network = api.network.getCurrentNetwork();

  const contractInfo = await api.identityResolution.resolveContract({
    contractReference: contractRef.value,
    type: contractRef.type,
    network,
  });

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

  const outputData: ContractErc721CallMintOutput = {
    contractId: contractInfo.contractId,
    network,
    transactionId: result.transactionId,
  };

  return { result: outputData };
}
