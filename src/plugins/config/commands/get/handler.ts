import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ConfigGetOutput } from './output';

import { inferConfigOptionType } from '@/plugins/config/schema';

import { ConfigGetInputSchema } from './input';

export class ConfigGetCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = ConfigGetInputSchema.parse(args.args);
    const name = validArgs.option;

    const value = api.config.getOption(name);
    const descriptor = api.config.listOptions().find((o) => o.name === name);
    const type = inferConfigOptionType(descriptor?.type, value);

    const output: ConfigGetOutput = {
      name,
      type,
      value,
      allowedValues: descriptor?.allowedValues,
    };

    return { result: output };
  }
}

export async function configGet(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ConfigGetCommand().execute(args);
}
