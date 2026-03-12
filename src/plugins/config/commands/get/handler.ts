import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { GetConfigOutput } from './output';

import { inferConfigOptionType } from '@/plugins/config/schema';

import { GetConfigInputSchema } from './input';

export class GetConfigCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = GetConfigInputSchema.parse(args.args);
    const name = validArgs.option;

    const value = api.config.getOption(name);
    const descriptor = api.config.listOptions().find((o) => o.name === name);
    const type = inferConfigOptionType(descriptor?.type, value);

    const output: GetConfigOutput = {
      name,
      type,
      value,
      allowedValues: descriptor?.allowedValues,
    };

    return { result: output };
  }
}

export async function getConfigOption(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new GetConfigCommand().execute(args);
}
