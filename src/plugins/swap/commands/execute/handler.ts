import type { CommandHandlerArgs, CommandResult } from '@/core';
import type {
  SwapTransferParams,
  SwapTransferType,
} from '@/core/services/transfer/types';
import type { SwapExecuteOutput } from './output';
import type {
  SwapExecuteBuildResult,
  SwapExecuteNormalizedParams,
  SwapExecuteSignResult,
  SwapExecuteTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandSwapStateHelper } from '@/plugins/swap/zustand-state-helper';

import { SwapExecuteInputSchema, SwapExecuteTransfersSchema } from './input';

export const SWAP_EXECUTE_COMMAND_NAME = 'swap_execute';

export class SwapExecuteCommand extends BaseTransactionCommand<
  SwapExecuteNormalizedParams,
  SwapExecuteBuildResult,
  SwapExecuteSignResult,
  SwapExecuteTransactionResult
> {
  constructor() {
    super(SWAP_EXECUTE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SwapExecuteNormalizedParams> {
    const { api, logger } = args;

    const swapState = new ZustandSwapStateHelper(api.state, logger);
    const validArgs = SwapExecuteInputSchema.parse(args.args);
    const { name } = validArgs;

    const network = api.network.getCurrentNetwork();
    const swapId = composeKey(network, name);

    const swapData = swapState.getSwap(swapId);
    if (!swapData) {
      throw new NotFoundError(`Swap not found: '${name}'`, {
        context: { name },
      });
    }
    if (swapData.executed) {
      throw new ValidationError(`Swap '${name}' has already been executed`);
    }

    // Validate transfers count and Hedera limits via Zod
    SwapExecuteTransfersSchema.parse(swapData.transfers);

    // Collect unique key refs from all transfers
    const keyRefIds = [
      ...new Set(
        swapData.transfers.flatMap((t) => [t.fromKeyRefId, t.toKeyRefId]),
      ),
    ];

    return { swapId, swapName: name, swapData, network, keyRefIds };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalizedParams: SwapExecuteNormalizedParams,
  ): Promise<SwapExecuteBuildResult> {
    const { api } = args;

    const swapTransfers: SwapTransferParams[] =
      normalizedParams.swapData.transfers.map((t) => ({
        type: t.type as SwapTransferType,
        fromAccountId: t.fromAccount,
        toAccountId: t.toAccount,
        amount: BigInt(t.amount),
        ...(t.tokenId && { tokenId: t.tokenId }),
      }));

    const transaction = api.transfer.createAtomicSwapTransaction(swapTransfers);
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalizedParams: SwapExecuteNormalizedParams,
    buildResult: SwapExecuteBuildResult,
  ): Promise<SwapExecuteSignResult> {
    const signedTransaction = await args.api.txSign.sign(
      buildResult.transaction,
      normalizedParams.keyRefIds,
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalizedParams: SwapExecuteNormalizedParams,
    _buildResult: SwapExecuteBuildResult,
    signResult: SwapExecuteSignResult,
  ): Promise<SwapExecuteTransactionResult> {
    const { api, logger } = args;

    const swapState = new ZustandSwapStateHelper(api.state, logger);
    const result = await api.txExecute.execute(signResult.signedTransaction);

    if (!result.success) {
      throw new TransactionError(
        `Atomic swap '${normalizedParams.swapName}' failed (txId: ${result.transactionId ?? 'unknown'}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
      );
    }

    const updatedSwapData = { ...normalizedParams.swapData, executed: true };
    swapState.saveSwap(normalizedParams.swapId, updatedSwapData);

    return { transactionResult: result, updatedSwapData };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalizedParams: SwapExecuteNormalizedParams,
    _buildResult: SwapExecuteBuildResult,
    _signResult: SwapExecuteSignResult,
    executeResult: SwapExecuteTransactionResult,
  ): Promise<CommandResult> {
    const output: SwapExecuteOutput = {
      swapName: normalizedParams.swapName,
      transactionId: executeResult.transactionResult.transactionId ?? '',
      success: executeResult.transactionResult.success,
      network: normalizedParams.network,
    };
    return { result: output };
  }
}

export async function swapExecute(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SwapExecuteCommand().execute(args);
}
