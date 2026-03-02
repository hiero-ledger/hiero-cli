import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ListConfigOutput } from './output';

export async function listConfigOptions(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const options = api.config.listOptions();
  const output: ListConfigOutput = {
    options,
    totalCount: options.length,
  };

  return { result: output };
}
