/**
 * Contract ERC721 transferFrom Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc721CallTransferFromOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { Status } from '@/core/shared/constants';
import { EntityReferenceType } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';

import { ContractErc721CallTransferFromInputSchema } from './input';

const ERC_721_FUNCTION_NAME = 'transferFrom';

export async function transferFromFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;
  try {
    const validArgs = ContractErc721CallTransferFromInputSchema.parse(
      args.args,
    );
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
      throw new Error(
        `Couldn't resolve EVM address for an account ${fromRef.value}`,
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
      throw new Error(
        `Couldn't resolve EVM address for an account ${toRef.value}`,
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
      return {
        status: Status.Failure,
        errorMessage: `Failed to call ${ERC_721_FUNCTION_NAME} function: ${result.receipt?.status?.status ?? 'UNKNOWN'}`,
      };
    }
    const outputData: ContractErc721CallTransferFromOutput = {
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
        `Failed to call ${ERC_721_FUNCTION_NAME} function`,
        error,
      ),
    };
  }
}
