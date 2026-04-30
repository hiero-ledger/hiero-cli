import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ContractErc721CallMintOutput } from './output';
import type {
  MintBuildTransactionResult,
  MintExecuteTransactionResult,
  MintNormalisedParams,
  MintSignTransactionResult,
} from './types';

import { ContractFunctionParameters } from '@hiero-ledger/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError, TransactionError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';

import { ContractErc721CallMintInputSchema } from './input';

const ERC_721_FUNCTION_NAME = 'mint';

export const CONTRACT_ERC721_MINT_COMMAND_NAME = 'contract-erc721_mint';

export class ContractErc721MintCommand extends BaseTransactionCommand<
  MintNormalisedParams,
  MintBuildTransactionResult,
  MintSignTransactionResult,
  MintExecuteTransactionResult
> {
  constructor() {
    super(CONTRACT_ERC721_MINT_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<MintNormalisedParams> {
    const { api } = args;

    const validArgs = ContractErc721CallMintInputSchema.parse(args.args);
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
    normalisedParams: MintNormalisedParams,
  ): Promise<MintBuildTransactionResult> {
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
    _normalisedParams: MintNormalisedParams,
    buildTransactionResult: MintBuildTransactionResult,
  ): Promise<MintSignTransactionResult> {
    const { api } = args;

    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [],
    );

    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: MintNormalisedParams,
    _buildTransactionResult: MintBuildTransactionResult,
    signTransactionResult: MintSignTransactionResult,
  ): Promise<MintExecuteTransactionResult> {
    const { api } = args;

    const transactionResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    return { transactionResult };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: MintNormalisedParams,
    _buildTransactionResult: MintBuildTransactionResult,
    _signTransactionResult: MintSignTransactionResult,
    executeTransactionResult: MintExecuteTransactionResult,
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

    const outputData: ContractErc721CallMintOutput = {
      contractId: normalisedParams.contractId,
      network: normalisedParams.network,
      transactionId: transactionResult.transactionId,
    };

    return { result: outputData };
  }
}

export async function contractErc721Mint(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ContractErc721MintCommand().execute(args);
}
