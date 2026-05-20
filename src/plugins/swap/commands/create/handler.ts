import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { SwapStateService } from '@/plugins/swap/services/swap-state.service.interface';
import type { SwapCreateOutput } from './output';

import { ValidationError } from '@/core/errors';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { SwapStateServiceImpl } from '@/plugins/swap/services/swap-state.service';

import { SwapCreateInputSchema } from './input';

export class SwapCreateCommand implements Command {
  constructor(private readonly swapState: SwapStateService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const validArgs = SwapCreateInputSchema.parse(args.args);
    const { name, memo } = validArgs;

    if (this.swapState.exists(name)) {
      throw new ValidationError(
        `Swap "${name}" already exists. Delete it first with: hcli swap delete -n ${name}`,
      );
    }

    this.swapState.saveSwap(name, { memo, transfers: [] });

    const output: SwapCreateOutput = {
      name,
      transferCount: 0,
      maxTransfers: HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
      memo,
    };

    return { result: output };
  }
}

export async function swapCreate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const swapState = new SwapStateServiceImpl(args.api.state);
  return new SwapCreateCommand(swapState).execute(args);
}
