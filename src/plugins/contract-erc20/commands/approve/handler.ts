/**
 * Contract ERC20 approve Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc20CallApproveOutput } from './output';
import type {
  ContractErc20ApproveBuildTransactionResult,
  ContractErc20ApproveExecuteTransactionResult,
  ContractErc20ApproveNormalizedParams,
  ContractErc20ApproveSignTransactionResult,
} from './types';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';

import { ContractErc20CallApproveInputSchema } from './input';

const ERC_20_FUNCTION_NAME = 'approve';

export const CONTRACT_ERC20_APPROVE_COMMAND_NAME = 'contract-erc20_approve';

export class ContractErc20ApproveCommand extends BaseTransactionCommand<
  ContractErc20ApproveNormalizedParams,
  ContractErc20ApproveBuildTransactionResult,
  ContractErc20ApproveSignTransactionResult,
  ContractErc20ApproveExecuteTransactionResult
> {
  constructor() {
    super(CONTRACT_ERC20_APPROVE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ContractErc20ApproveNormalizedParams> {
    const { api } = args;

    const validArgs = ContractErc20CallApproveInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();

    const contractInfo = await api.identityResolution.resolveContract({
      contractReference: validArgs.contract.value,
      type: validArgs.contract.type,
      network,
    });

    const spenderEvmAddress =
      validArgs.spender.type === EntityReferenceType.EVM_ADDRESS
        ? validArgs.spender.value
        : (
            await api.identityResolution.resolveAccount({
              accountReference: validArgs.spender.value,
              type: validArgs.spender.type,
              network,
            })
          ).evmAddress;

    if (!spenderEvmAddress) {
      throw new NotFoundError(
        `Couldn't resolve EVM address for an account ${validArgs.spender.value}`,
        { context: { spenderRef: validArgs.spender.value } },
      );
    }

    return {
      contractId: contractInfo.contractId,
      gas: validArgs.gas,
      spenderEvmAddress,
      value: validArgs.value,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ContractErc20ApproveNormalizedParams,
  ): Promise<ContractErc20ApproveBuildTransactionResult> {
    const { api } = args;

    const functionParameters: ContractFunctionParameters =
      new ContractFunctionParameters()
        .addAddress(normalisedParams.spenderEvmAddress)
        .addUint256(normalisedParams.value);

    const contractCallTransaction = api.contract.contractExecuteTransaction({
      contractId: normalisedParams.contractId,
      gas: normalisedParams.gas,
      functionName: ERC_20_FUNCTION_NAME,
      functionParameters,
    });

    return {
      transaction: contractCallTransaction.transaction,
    };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: ContractErc20ApproveNormalizedParams,
    buildTransactionResult: ContractErc20ApproveBuildTransactionResult,
  ): Promise<ContractErc20ApproveSignTransactionResult> {
    const { api } = args;

    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [],
    );

    return {
      signedTransaction: transaction,
    };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ContractErc20ApproveNormalizedParams,
    _buildTransactionResult: ContractErc20ApproveBuildTransactionResult,
    signTransactionResult: ContractErc20ApproveSignTransactionResult,
  ): Promise<ContractErc20ApproveExecuteTransactionResult> {
    const { api } = args;

    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `Failed to call ${ERC_20_FUNCTION_NAME} on contract ${normalisedParams.contractId} (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
        { context: { status: result.receipt?.status?.status } },
      );
    }

    return {
      transactionResult: result,
    };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: ContractErc20ApproveNormalizedParams,
    _buildTransactionResult: ContractErc20ApproveBuildTransactionResult,
    _signTransactionResult: ContractErc20ApproveSignTransactionResult,
    executeTransactionResult: ContractErc20ApproveExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: ContractErc20CallApproveOutput = {
      contractId: normalisedParams.contractId,
      network: normalisedParams.network,
      transactionId: executeTransactionResult.transactionResult.transactionId,
    };

    return { result: outputData };
  }
}

export async function contractErc20Approve(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ContractErc20ApproveCommand().execute(args);
}
