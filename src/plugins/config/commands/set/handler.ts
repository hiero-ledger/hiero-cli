import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ConfigSetOutput } from './output';

import { inferConfigOptionType } from '@/plugins/config/schema';

import { ConfigSetInputSchema } from './input';

export class ConfigSetCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validArgs = ConfigSetInputSchema.parse(args.args);

    const entry = Object.entries(validArgs).find(([, v]) => v !== undefined)!;
    const name = entry[0];
    const value = entry[1] as boolean | number | string;

    const prev = api.config.getOption(name);
    const descriptor = api.config.listOptions().find((o) => o.name === name);
    const type = inferConfigOptionType(descriptor?.type, value);
    api.config.setOption(name, value);

    const output: ConfigSetOutput = {
      name,
      type,
      previousValue: prev,
      newValue: value,
    };

    return { result: output };
  }
}

export async function configSet(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ConfigSetCommand().execute(args);
}
