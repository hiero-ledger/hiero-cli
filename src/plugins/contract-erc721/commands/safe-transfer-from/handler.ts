import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc721CallSafeTransferFromOutput } from './output';
import type {
  SafeTransferFromBuildTransactionResult,
  SafeTransferFromExecuteTransactionResult,
  SafeTransferFromNormalisedParams,
  SafeTransferFromSignTransactionResult,
} from './types';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';

import { ContractErc721CallSafeTransferFromInputSchema } from './input';

const ERC_721_FUNCTION_NAME = 'safeTransferFrom';

export const CONTRACT_ERC721_SAFE_TRANSFER_FROM_COMMAND_NAME =
  'contract-erc721_safe-transfer-from';

export class SafeTransferFromCommand extends BaseTransactionCommand<
  SafeTransferFromNormalisedParams,
  SafeTransferFromBuildTransactionResult,
  SafeTransferFromSignTransactionResult,
  SafeTransferFromExecuteTransactionResult
> {
  constructor() {
    super(CONTRACT_ERC721_SAFE_TRANSFER_FROM_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SafeTransferFromNormalisedParams> {
    const { api } = args;

    const validArgs = ContractErc721CallSafeTransferFromInputSchema.parse(
      args.args,
    );
    const contractRef = validArgs.contract;
    const gas = validArgs.gas;
    const fromRef = validArgs.from;
    const toRef = validArgs.to;
    const tokenId = validArgs.tokenId;
    const data = validArgs.data;
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
        `Couldn't resolve EVM address for an account ${fromRef.value}`,
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
        `Couldn't resolve EVM address for an account ${toRef.value}`,
        { context: { accountRef: toRef.value } },
      );
    }

    return {
      contractId: contractInfo.contractId,
      fromEvmAddress,
      toEvmAddress,
      tokenId,
      data,
      gas,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: SafeTransferFromNormalisedParams,
  ): Promise<SafeTransferFromBuildTransactionResult> {
    const { api } = args;

    const functionParameters: ContractFunctionParameters =
      new ContractFunctionParameters()
        .addAddress(normalisedParams.fromEvmAddress)
        .addAddress(normalisedParams.toEvmAddress)
        .addUint256(normalisedParams.tokenId);

    if (normalisedParams.data) {
      functionParameters.addBytes(
        Buffer.from(normalisedParams.data.slice(2), 'hex'),
      );
    }

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
    _normalisedParams: SafeTransferFromNormalisedParams,
    buildTransactionResult: SafeTransferFromBuildTransactionResult,
  ): Promise<SafeTransferFromSignTransactionResult> {
    const { api } = args;

    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [],
    );

    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: SafeTransferFromNormalisedParams,
    _buildTransactionResult: SafeTransferFromBuildTransactionResult,
    signTransactionResult: SafeTransferFromSignTransactionResult,
  ): Promise<SafeTransferFromExecuteTransactionResult> {
    const { api } = args;

    const transactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    return { transactionResult };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: SafeTransferFromNormalisedParams,
    _buildTransactionResult: SafeTransferFromBuildTransactionResult,
    _signTransactionResult: SafeTransferFromSignTransactionResult,
    executeTransactionResult: SafeTransferFromExecuteTransactionResult,
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

    const outputData: ContractErc721CallSafeTransferFromOutput = {
      contractId: normalisedParams.contractId,
      network: normalisedParams.network,
      transactionId: transactionResult.transactionId,
    };

    return { result: outputData };
  }
}

export async function safeTransferFromFunctionCall(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SafeTransferFromCommand().execute(args);
}
