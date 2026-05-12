import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { SwapStateService } from '@/plugins/swap/services/swap-state.service.interface';
import type { SwapListOutput } from './output';

import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { SwapStateServiceImpl } from '@/plugins/swap/services/swap-state.service';

export class SwapListCommand implements Command {
  constructor(private readonly swapState: SwapStateService) {}

  async execute(_args: CommandHandlerArgs): Promise<CommandResult> {
    const swaps = this.swapState.listSwaps();

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
  const swapState = new SwapStateServiceImpl(args.api.state);
  return new SwapListCommand(swapState).execute(args);
}
