import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { SwapListOutput } from './output';

import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { SwapStateHelper } from '@/plugins/swap/state-helper';

export class SwapListCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const helper = new SwapStateHelper(api.state);
    const swaps = helper.listSwaps();

    const output: SwapListOutput = {
      totalCount: swaps.length,
      swaps: swaps.map(({ name, entry }) => ({
        name,
        memo: entry.memo,
        transferCount: entry.transfers.length,
        maxTransfers: HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
      })),
    };

    return { result: output };
  }
}

export async function swapList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SwapListCommand().execute(args);
}
