import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { SwapDeleteOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { SwapStateHelper } from '@/plugins/swap/state-helper';

import { SwapDeleteInputSchema } from './input';

export class SwapDeleteCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = SwapDeleteInputSchema.parse(args.args);
    const { name } = validArgs;

    const helper = new SwapStateHelper(api.state);
    if (!helper.exists(name)) {
      throw new NotFoundError(
        `Swap "${name}" not found. Create it first with: hcli swap create -n ${name}`,
      );
    }
    helper.deleteSwap(name);

    const output: SwapDeleteOutput = { name };

    return { result: output };
  }
}

export async function swapDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SwapDeleteCommand().execute(args);
}
