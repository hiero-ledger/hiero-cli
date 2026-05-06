import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { SwapTransfer } from '@/plugins/swap/schema';
import type { SwapViewOutput } from './output';

import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { SwapTransferType } from '@/plugins/swap/schema';
import { SwapStateHelper } from '@/plugins/swap/state-helper';

import { SwapViewInputSchema } from './input';

export class SwapViewCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = SwapViewInputSchema.parse(args.args);
    const { name } = validArgs;

    const helper = new SwapStateHelper(api.state);
    const swap = helper.getSwapOrThrow(name);

    const output: SwapViewOutput = {
      name,
      memo: swap.memo,
      transferCount: swap.transfers.length,
      maxTransfers: HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
      transfers: swap.transfers.map((t, i) => ({
        index: i + 1,
        type: t.type,
        from: t.from.accountId,
        to: t.to,
        detail: buildDetail(t),
      })),
    };

    return { result: output };
  }
}

export async function swapView(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SwapViewCommand().execute(args);
}

function buildDetail(t: SwapTransfer): string {
  if (t.type === SwapTransferType.HBAR) return t.amount;
  if (t.type === SwapTransferType.FT) return `token: ${t.token}  ${t.amount}`;
  return `token: ${t.token}  serials: ${t.serials.join(', ')}`;
}
