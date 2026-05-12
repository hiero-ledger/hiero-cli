import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { SwapTransfer } from '@/plugins/swap/schema';
import type { SwapStateService } from '@/plugins/swap/services/swap-state.service.interface';
import type { SwapViewOutput } from './output';

import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { SwapTransferType } from '@/plugins/swap/schema';
import { SwapStateServiceImpl } from '@/plugins/swap/services/swap-state.service';

import { SwapViewInputSchema } from './input';

export class SwapViewCommand implements Command {
  constructor(private readonly swapState: SwapStateService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const validArgs = SwapViewInputSchema.parse(args.args);
    const { name } = validArgs;

    const swap = this.swapState.getSwapOrThrow(name);

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
  const swapState = new SwapStateServiceImpl(args.api.state);
  return new SwapViewCommand(swapState).execute(args);
}

function buildDetail(t: SwapTransfer): string {
  if (t.type === SwapTransferType.HBAR) return t.amount;
  if (t.type === SwapTransferType.FT) return `token: ${t.token}  ${t.amount}`;
  return `token: ${t.token}  serials: ${t.serials.join(', ')}`;
}
