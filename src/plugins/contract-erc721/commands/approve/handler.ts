import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc721CallApproveOutput } from './output';
import type {
  ApproveBuildTransactionResult,
  ApproveExecuteTransactionResult,
  ApproveNormalisedParams,
  ApproveSignTransactionResult,
} from './types';

import { ContractFunctionParameters } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';

import { ContractErc721CallApproveInputSchema } from './input';

const ERC_721_FUNCTION_NAME = 'approve';

export const CONTRACT_ERC721_APPROVE_COMMAND_NAME = 'contract-erc721_approve';

export class ContractErc721ApproveCommand extends BaseTransactionCommand<
  ApproveNormalisedParams,
  ApproveBuildTransactionResult,
  ApproveSignTransactionResult,
  ApproveExecuteTransactionResult
> {
  constructor() {
    super(CONTRACT_ERC721_APPROVE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ApproveNormalisedParams> {
    const { api } = args;

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
      toEvmAddress,
      tokenId,
      gas,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ApproveNormalisedParams,
  ): Promise<ApproveBuildTransactionResult> {
    const { api } = args;

    const functionParameters: ContractFunctionParameters =
      new ContractFunctionParameters()
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
    _normalisedParams: ApproveNormalisedParams,
    buildTransactionResult: ApproveBuildTransactionResult,
  ): Promise<ApproveSignTransactionResult> {
    const { api } = args;

    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [],
    );

    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: ApproveNormalisedParams,
    _buildTransactionResult: ApproveBuildTransactionResult,
    signTransactionResult: ApproveSignTransactionResult,
  ): Promise<ApproveExecuteTransactionResult> {
    const { api } = args;

    const transactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    return { transactionResult };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: ApproveNormalisedParams,
    _buildTransactionResult: ApproveBuildTransactionResult,
    _signTransactionResult: ApproveSignTransactionResult,
    executeTransactionResult: ApproveExecuteTransactionResult,
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

    const outputData: ContractErc721CallApproveOutput = {
      contractId: normalisedParams.contractId,
      network: normalisedParams.network,
      transactionId: transactionResult.transactionId,
    };

    return { result: outputData };
  }
}

export async function contractErc721Approve(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ContractErc721ApproveCommand().execute(args);
}
