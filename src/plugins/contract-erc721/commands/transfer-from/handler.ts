import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc721CallTransferFromOutput } from './output';
import type {
  TransferFromBuildTransactionResult,
  TransferFromExecuteTransactionResult,
  TransferFromNormalisedParams,
  TransferFromSignTransactionResult,
} from './types';

import { ContractFunctionParameters } from '@hiero-ledger/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';

import { ContractErc721CallTransferFromInputSchema } from './input';

const ERC_721_FUNCTION_NAME = 'transferFrom';

export const CONTRACT_ERC721_TRANSFER_FROM_COMMAND_NAME =
  'contract-erc721_transfer-from';

export class ContractErc721TransferFromCommand extends BaseTransactionCommand<
  TransferFromNormalisedParams,
  TransferFromBuildTransactionResult,
  TransferFromSignTransactionResult,
  TransferFromExecuteTransactionResult
> {
  constructor() {
    super(CONTRACT_ERC721_TRANSFER_FROM_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TransferFromNormalisedParams> {
    const { api } = args;

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
      gas,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TransferFromNormalisedParams,
  ): Promise<TransferFromBuildTransactionResult> {
    const { api } = args;

    const functionParameters: ContractFunctionParameters =
      new ContractFunctionParameters()
        .addAddress(normalisedParams.fromEvmAddress)
        .addAddress(normalisedParams.toEvmAddress)
        .addUint256(normalisedParams.tokenId);

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
    _normalisedParams: TransferFromNormalisedParams,
    buildTransactionResult: TransferFromBuildTransactionResult,
  ): Promise<TransferFromSignTransactionResult> {
    const { api } = args;

    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [],
    );

    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: TransferFromNormalisedParams,
    _buildTransactionResult: TransferFromBuildTransactionResult,
    signTransactionResult: TransferFromSignTransactionResult,
  ): Promise<TransferFromExecuteTransactionResult> {
    const { api } = args;

    const transactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    return { transactionResult };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: TransferFromNormalisedParams,
    _buildTransactionResult: TransferFromBuildTransactionResult,
    _signTransactionResult: TransferFromSignTransactionResult,
    executeTransactionResult: TransferFromExecuteTransactionResult,
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

    const outputData: ContractErc721CallTransferFromOutput = {
      contractId: normalisedParams.contractId,
      network: normalisedParams.network,
      transactionId: transactionResult.transactionId,
    };

    return { result: outputData };
  }
}

export async function contractErc721TransferFrom(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ContractErc721TransferFromCommand().execute(args);
}
