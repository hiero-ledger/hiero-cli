import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ConfigListOutput } from './output';

export class ConfigListCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const options = api.config.listOptions();
    const output: ConfigListOutput = {
      options,
      totalCount: options.length,
    };

    return { result: output };
  }
}

export async function configList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ConfigListCommand().execute(args);
}
