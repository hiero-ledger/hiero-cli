import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc721CallSetApprovalForAllOutput } from './output';
import type {
  SetApprovalForAllBuildTransactionResult,
  SetApprovalForAllExecuteTransactionResult,
  SetApprovalForAllNormalisedParams,
  SetApprovalForAllSignTransactionResult,
} from './types';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';

import { ContractErc721CallSetApprovalForAllInputSchema } from './input';

const ERC_721_FUNCTION_NAME = 'setApprovalForAll';

export class SetApprovalForAllCommand extends BaseTransactionCommand<
  SetApprovalForAllNormalisedParams,
  SetApprovalForAllBuildTransactionResult,
  SetApprovalForAllSignTransactionResult,
  SetApprovalForAllExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SetApprovalForAllNormalisedParams> {
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
        `Couldn't resolve EVM address for an account ${operatorRef.value}`,
        { context: { accountRef: operatorRef.value } },
      );
    }

    return {
      contractId: contractInfo.contractId,
      operatorEvmAddress,
      approved,
      gas,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: SetApprovalForAllNormalisedParams,
  ): Promise<SetApprovalForAllBuildTransactionResult> {
    const { api } = args;

    const functionParameters: ContractFunctionParameters =
      new ContractFunctionParameters()
        .addAddress(normalisedParams.operatorEvmAddress)
        .addBool(normalisedParams.approved);

    const contractCallTransaction = api.contract.contractExecuteTransaction({
      contractId: normalisedParams.contractId,
      gas: normalisedParams.gas,
      functionName: ERC_721_FUNCTION_NAME,
      functionParameters,
    });

    return { transaction: contractCallTransaction.transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: SetApprovalForAllNormalisedParams,
    buildTransactionResult: SetApprovalForAllBuildTransactionResult,
  ): Promise<SetApprovalForAllSignTransactionResult> {
    const { api } = args;

    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [],
    );

    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: SetApprovalForAllNormalisedParams,
    _buildTransactionResult: SetApprovalForAllBuildTransactionResult,
    signTransactionResult: SetApprovalForAllSignTransactionResult,
  ): Promise<SetApprovalForAllExecuteTransactionResult> {
    const { api } = args;

    const transactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    return { transactionResult };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: SetApprovalForAllNormalisedParams,
    _buildTransactionResult: SetApprovalForAllBuildTransactionResult,
    _signTransactionResult: SetApprovalForAllSignTransactionResult,
    executeTransactionResult: SetApprovalForAllExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { transactionResult } = executeTransactionResult;

    if (!transactionResult.success) {
      throw new TransactionError(
        `Failed to call ${ERC_721_FUNCTION_NAME} on contract ${normalisedParams.contractId} (txId: ${transactionResult.transactionId}, status: ${transactionResult.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
        {
          context: { contractId: normalisedParams.contractId },
          cause: transactionResult.receipt,
        },
      );
    }

    const outputData: ContractErc721CallSetApprovalForAllOutput = {
      contractId: normalisedParams.contractId,
      network: normalisedParams.network,
      transactionId: transactionResult.transactionId,
    };

    return { result: outputData };
  }
}

export async function setApprovalForAllFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SetApprovalForAllCommand().execute(args);
}
