/**
 * Contract ERC20 transfer Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc20CallTransferOutput } from './output';
import type {
  ContractErc20TransferBuildTransactionResult,
  ContractErc20TransferExecuteTransactionResult,
  ContractErc20TransferNormalizedParams,
  ContractErc20TransferSignTransactionResult,
} from './types';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';

import { ContractErc20CallTransferInputSchema } from './input';

const ERC_20_FUNCTION_NAME = 'transfer';

export const CONTRACT_ERC20_TRANSFER_COMMAND_NAME = 'contract-erc20_transfer';

export class ContractErc20TransferCommand extends BaseTransactionCommand<
  ContractErc20TransferNormalizedParams,
  ContractErc20TransferBuildTransactionResult,
  ContractErc20TransferSignTransactionResult,
  ContractErc20TransferExecuteTransactionResult
> {
  constructor() {
    super(CONTRACT_ERC20_TRANSFER_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ContractErc20TransferNormalizedParams> {
    const { api } = args;

    const validArgs = ContractErc20CallTransferInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const contractInfo = await api.identityResolution.resolveContract({
      contractReference: validArgs.contract.value,
      type: validArgs.contract.type,
      network,
    });

    const accountToEvmAddress =
      validArgs.to.type === EntityReferenceType.EVM_ADDRESS
        ? validArgs.to.value
        : (
            await api.identityResolution.resolveAccount({
              accountReference: validArgs.to.value,
              type: validArgs.to.type,
              network,
            })
          ).evmAddress;

    if (!accountToEvmAddress) {
      throw new NotFoundError(
        `Couldn't resolve EVM address for an account ${validArgs.to.value}`,
        { context: { accountToRef: validArgs.to.value } },
      );
    }

    return {
      contractId: contractInfo.contractId,
      gas: validArgs.gas,
      accountToEvmAddress,
      value: validArgs.value,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ContractErc20TransferNormalizedParams,
  ): Promise<ContractErc20TransferBuildTransactionResult> {
    const { api } = args;

    const functionParameters: ContractFunctionParameters =
      new ContractFunctionParameters()
        .addAddress(normalisedParams.accountToEvmAddress)
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
    _normalisedParams: ContractErc20TransferNormalizedParams,
    buildTransactionResult: ContractErc20TransferBuildTransactionResult,
  ): Promise<ContractErc20TransferSignTransactionResult> {
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
    normalisedParams: ContractErc20TransferNormalizedParams,
    _buildTransactionResult: ContractErc20TransferBuildTransactionResult,
    signTransactionResult: ContractErc20TransferSignTransactionResult,
  ): Promise<ContractErc20TransferExecuteTransactionResult> {
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
    normalisedParams: ContractErc20TransferNormalizedParams,
    _buildTransactionResult: ContractErc20TransferBuildTransactionResult,
    _signTransactionResult: ContractErc20TransferSignTransactionResult,
    executeTransactionResult: ContractErc20TransferExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: ContractErc20CallTransferOutput = {
      contractId: normalisedParams.contractId,
      network: normalisedParams.network,
      transactionId: executeTransactionResult.transactionResult.transactionId,
    };

    return { result: outputData };
  }
}

export async function contractErc20Transfer(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ContractErc20TransferCommand().execute(args);
}
