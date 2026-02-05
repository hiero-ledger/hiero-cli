/**
 * Contract ERC721 setApprovalForAll Command Handler
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ContractErc721CallSetApprovalForAllOutput } from './output';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { Status } from '@/core/shared/constants';
import { EntityReferenceType } from '@/core/types/shared.types';
import { formatError } from '@/core/utils/errors';

import { ContractErc721CallSetApprovalForAllInputSchema } from './input';

const ERC_721_FUNCTION_NAME = 'setApprovalForAll';

export async function setApprovalForAllFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;
  try {
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

    let operatorEvmAddress: string | null | undefined;
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
      throw new Error(
        `Couldn't resolve EVM address for an account ${operatorRef.value}`,
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
      return {
        status: Status.Failure,
        errorMessage: `Failed to call ${ERC_721_FUNCTION_NAME} function: ${result.receipt?.status?.status ?? 'UNKNOWN'}`,
      };
    }
    const outputData: ContractErc721CallSetApprovalForAllOutput = {
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
