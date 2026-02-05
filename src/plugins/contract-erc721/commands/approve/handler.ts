/**
 * Contract ERC721 approve Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc721CallApproveOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { Status } from '@/core/shared/constants';
import { EntityReferenceType } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';

import { ContractErc721CallApproveInputSchema } from './input';

const ERC_721_FUNCTION_NAME = 'approve';

export async function approveFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;
  try {
    const validArgs = ContractErc721CallApproveInputSchema.parse(args.args);
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

    const outputData: ContractErc721CallApproveOutput = {
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
