import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { SwapListOutput } from './output';

import { ZustandSwapStateHelper } from '@/plugins/swap/zustand-state-helper';

export class SwapListCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const swapState = new ZustandSwapStateHelper(api.state, logger);
    const swaps = swapState.listSwaps();

    const output: SwapListOutput = {
      swaps: swaps.map((swap) => ({
        name: swap.name,
        network: swap.network,
        executed: swap.executed,
        createdAt: swap.createdAt,
        transferCount: swap.transfers.length,
        transfers: swap.transfers.map((t, idx) => ({
          index: idx + 1,
          type: t.type,
          fromAccount: t.fromAccount,
          toAccount: t.toAccount,
          amount: t.amount,
          ...(t.tokenId && { tokenId: t.tokenId }),
        })),
      })),
      totalCount: swaps.length,
    };

    return { result: output };
  }
}

export async function swapList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SwapListCommand().execute(args);
}
