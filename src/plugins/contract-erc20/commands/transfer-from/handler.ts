/**
 * Contract ERC20 transferFrom Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc20CallTransferFromOutput } from './output';
import type {
  ContractErc20TransferFromBuildTransactionResult,
  ContractErc20TransferFromExecuteTransactionResult,
  ContractErc20TransferFromNormalizedParams,
  ContractErc20TransferFromSignTransactionResult,
} from './types';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';

import { ContractErc20CallTransferFromInputSchema } from './input';

const ERC_20_FUNCTION_NAME = 'transferFrom';

export const CONTRACT_ERC20_TRANSFER_FROM_COMMAND_NAME =
  'contract-erc20_transfer-from';

export class ContractErc20TransferFromCommand extends BaseTransactionCommand<
  ContractErc20TransferFromNormalizedParams,
  ContractErc20TransferFromBuildTransactionResult,
  ContractErc20TransferFromSignTransactionResult,
  ContractErc20TransferFromExecuteTransactionResult
> {
  constructor() {
    super(CONTRACT_ERC20_TRANSFER_FROM_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ContractErc20TransferFromNormalizedParams> {
    const { api } = args;

    const validArgs = ContractErc20CallTransferFromInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();

    const contractInfo = await api.identityResolution.resolveContract({
      contractReference: validArgs.contract.value,
      type: validArgs.contract.type,
      network,
    });

    const fromEvmAddress =
      validArgs.from.type === EntityReferenceType.EVM_ADDRESS
        ? validArgs.from.value
        : (
            await api.identityResolution.resolveAccount({
              accountReference: validArgs.from.value,
              type: validArgs.from.type,
              network,
            })
          ).evmAddress;

    if (!fromEvmAddress) {
      throw new NotFoundError(
        `Couldn't resolve EVM address for an account ${validArgs.from.value}`,
        { context: { fromRef: validArgs.from.value } },
      );
    }

    const toEvmAddress =
      validArgs.to.type === EntityReferenceType.EVM_ADDRESS
        ? validArgs.to.value
        : (
            await api.identityResolution.resolveAccount({
              accountReference: validArgs.to.value,
              type: validArgs.to.type,
              network,
            })
          ).evmAddress;

    if (!toEvmAddress) {
      throw new NotFoundError(
        `Couldn't resolve EVM address for an account ${validArgs.to.value}`,
        { context: { toRef: validArgs.to.value } },
      );
    }

    return {
      contractId: contractInfo.contractId,
      gas: validArgs.gas,
      fromEvmAddress,
      toEvmAddress,
      value: validArgs.value,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ContractErc20TransferFromNormalizedParams,
  ): Promise<ContractErc20TransferFromBuildTransactionResult> {
    const { api } = args;

    const functionParameters: ContractFunctionParameters =
      new ContractFunctionParameters()
        .addAddress(normalisedParams.fromEvmAddress)
        .addAddress(normalisedParams.toEvmAddress)
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
    _normalisedParams: ContractErc20TransferFromNormalizedParams,
    buildTransactionResult: ContractErc20TransferFromBuildTransactionResult,
  ): Promise<ContractErc20TransferFromSignTransactionResult> {
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
    normalisedParams: ContractErc20TransferFromNormalizedParams,
    _buildTransactionResult: ContractErc20TransferFromBuildTransactionResult,
    signTransactionResult: ContractErc20TransferFromSignTransactionResult,
  ): Promise<ContractErc20TransferFromExecuteTransactionResult> {
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
    normalisedParams: ContractErc20TransferFromNormalizedParams,
    _buildTransactionResult: ContractErc20TransferFromBuildTransactionResult,
    _signTransactionResult: ContractErc20TransferFromSignTransactionResult,
    executeTransactionResult: ContractErc20TransferFromExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: ContractErc20CallTransferFromOutput = {
      contractId: normalisedParams.contractId,
      network: normalisedParams.network,
      transactionId: executeTransactionResult.transactionResult.transactionId,
    };

    return { result: outputData };
  }
}

export async function contractErc20TransferFrom(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ContractErc20TransferFromCommand().execute(args);
}
