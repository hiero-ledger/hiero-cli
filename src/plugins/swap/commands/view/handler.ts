import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { SwapTransfer } from '@/plugins/swap/schema';
import type { SwapViewOutput } from './output';

import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { SwapTransferType } from '@/plugins/swap/schema';
import { SwapStateHelper } from '@/plugins/swap/state-helper';
import {
  formatAccount,
  formatToken,
} from '@/plugins/swap/utils/format-helpers';

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
        from: formatAccount(t.from.input, t.from.accountId),
        to: formatAccount(t.to.input, t.to.accountId),
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
  if (t.type === SwapTransferType.FT)
    return `token: ${formatToken(t.token.input, t.token.tokenId)}  ${t.amount}`;
  return `token: ${formatToken(t.token.input, t.token.tokenId)}  serials: ${t.serials.join(', ')}`;
}
