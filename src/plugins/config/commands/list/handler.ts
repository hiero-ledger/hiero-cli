import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ListConfigOutput } from './output';

export class ListConfigCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const options = api.config.listOptions();
    const output: ListConfigOutput = {
      options,
      totalCount: options.length,
    };

    return { result: output };
  }
}

export async function configList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ListConfigCommand().execute(args);
}
