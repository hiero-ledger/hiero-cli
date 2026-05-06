import type { CommandHandlerArgs, CommandResult } from '@/core';
import type {
  FtSwapTransfer,
  HbarSwapTransfer,
  NftSwapTransfer,
  SwapTransfer,
} from '@/plugins/swap/schema';
import type { SwapExecuteOutput, SwapTransferSummary } from './output';
import type {
  SwapExecuteBuildTransactionResult,
  SwapExecuteExecuteTransactionResult,
  SwapExecuteNormalisedParams,
  SwapExecuteSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { TransactionError, ValidationError } from '@/core/errors';
import {
  FtTransferEntry,
  HbarTransferEntry,
  NftTransferEntry,
} from '@/core/services/transfer';
import { SwapTransferType } from '@/plugins/swap/schema';
import { SwapStateHelper } from '@/plugins/swap/state-helper';

import { SwapExecuteInputSchema } from './input';

export const SWAP_EXECUTE_COMMAND_NAME = 'swap_execute';

export class SwapExecuteCommand extends BaseTransactionCommand<
  SwapExecuteNormalisedParams,
  SwapExecuteBuildTransactionResult,
  SwapExecuteSignTransactionResult,
  SwapExecuteExecuteTransactionResult
> {
  constructor() {
    super(SWAP_EXECUTE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SwapExecuteNormalisedParams> {
    const { api } = args;

    const validArgs = SwapExecuteInputSchema.parse(args.args);
    const { name } = validArgs;

    const helper = new SwapStateHelper(api.state);
    const swap = helper.getSwapOrThrow(name);

    if (swap.transfers.length === 0) {
      throw new ValidationError(
        `Swap "${name}" has no transfers. Add at least one with: hcli swap add-hbar/add-ft/add-nft -n ${name}`,
      );
    }

    const network = api.network.getCurrentNetwork();

    const entries = swap.transfers.flatMap((transfer) =>
      this.buildEntries(transfer),
    );

    const keyRefIds = [...new Set(swap.transfers.map((t) => t.from.keyRefId))];

    return { name, network, swap, entries, keyRefIds };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: SwapExecuteNormalisedParams,
  ): Promise<SwapExecuteBuildTransactionResult> {
    const { api } = args;
    const transaction = api.transfer.buildTransferTransaction(
      normalisedParams.entries,
      normalisedParams.swap.memo,
    );
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: SwapExecuteNormalisedParams,
    buildTransactionResult: SwapExecuteBuildTransactionResult,
  ): Promise<SwapExecuteSignTransactionResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.keyRefIds,
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: SwapExecuteNormalisedParams,
    _buildTransactionResult: SwapExecuteBuildTransactionResult,
    signTransactionResult: SwapExecuteSignTransactionResult,
  ): Promise<SwapExecuteExecuteTransactionResult> {
    const { api } = args;
    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `Swap "${normalisedParams.name}" failed (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
        false,
      );
    }

    const helper = new SwapStateHelper(api.state);
    helper.deleteSwap(normalisedParams.name);

    return result;
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: SwapExecuteNormalisedParams,
    _buildTransactionResult: SwapExecuteBuildTransactionResult,
    _signTransactionResult: SwapExecuteSignTransactionResult,
    executeTransactionResult: SwapExecuteExecuteTransactionResult,
  ): Promise<CommandResult> {
    const transfers: SwapTransferSummary[] =
      normalisedParams.swap.transfers.map((t) => this.buildSummary(t));

    const output: SwapExecuteOutput = {
      transactionId: executeTransactionResult.transactionId ?? '',
      network: normalisedParams.network,
      swapName: normalisedParams.name,
      transferCount: normalisedParams.swap.transfers.length,
      transfers,
    };

    return { result: output };
  }
  private buildEntries(
    transfer: SwapTransfer,
  ): (HbarTransferEntry | FtTransferEntry | NftTransferEntry)[] {
    if (transfer.type === SwapTransferType.HBAR) {
      return [this.buildHbarEntry(transfer)];
    }
    if (transfer.type === SwapTransferType.FT) {
      return [this.buildFtEntry(transfer)];
    }
    return this.buildNftEntries(transfer);
  }

  private buildHbarEntry(t: HbarSwapTransfer): HbarTransferEntry {
    return new HbarTransferEntry(t.from.accountId, t.to, BigInt(t.amount));
  }

  private buildFtEntry(t: FtSwapTransfer): FtTransferEntry {
    return new FtTransferEntry(
      t.from.accountId,
      t.to,
      t.token,
      BigInt(t.amount),
    );
  }

  private buildNftEntries(t: NftSwapTransfer): NftTransferEntry[] {
    return t.serials.map(
      (serial) => new NftTransferEntry(t.from.accountId, t.to, t.token, serial),
    );
  }

  private buildSummary(transfer: SwapTransfer): SwapTransferSummary {
    const from = transfer.from.accountId;
    const to = transfer.to;

    if (transfer.type === SwapTransferType.HBAR) {
      return { type: SwapTransferType.HBAR, from, to, detail: transfer.amount };
    }
    if (transfer.type === SwapTransferType.FT) {
      return {
        type: SwapTransferType.FT,
        from,
        to,
        detail: `token: ${transfer.token}  ${transfer.amount}`,
      };
    }
    return {
      type: SwapTransferType.NFT,
      from,
      to,
      detail: `token: ${transfer.token}  serials: ${transfer.serials.join(', ')}`,
    };
  }
}

export async function swapExecute(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SwapExecuteCommand().execute(args);
}
