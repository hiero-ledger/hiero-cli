import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { SwapCreateOutput } from './output';

import { ValidationError } from '@/core/errors';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { SwapStateHelper } from '@/plugins/swap/state-helper';

import { SwapCreateInputSchema } from './input';

export class SwapCreateCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = SwapCreateInputSchema.parse(args.args);
    const { name, memo } = validArgs;

    const helper = new SwapStateHelper(api.state);
    if (helper.exists(name)) {
      throw new ValidationError(
        `Swap "${name}" already exists. Delete it first with: hcli swap delete -n ${name}`,
      );
    }

    helper.saveSwap(name, { memo, transfers: [] });

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
  return new SwapCreateCommand().execute(args);
}
