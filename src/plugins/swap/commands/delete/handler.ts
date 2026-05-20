import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { SwapStateService } from '@/plugins/swap/services/swap-state.service.interface';
import type { SwapDeleteOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { SwapStateServiceImpl } from '@/plugins/swap/services/swap-state.service';

import { SwapDeleteInputSchema } from './input';

export class SwapDeleteCommand implements Command {
  constructor(private readonly swapState: SwapStateService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const validArgs = SwapDeleteInputSchema.parse(args.args);
    const { name } = validArgs;

    if (!this.swapState.exists(name)) {
      throw new NotFoundError(
        `Swap "${name}" not found. Create it first with: hcli swap create -n ${name}`,
      );
    }
    this.swapState.deleteSwap(name);

    const output: SwapDeleteOutput = { name };

    return { result: output };
  }
}

export async function swapDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const swapState = new SwapStateServiceImpl(args.api.state);
  return new SwapDeleteCommand(swapState).execute(args);
}
