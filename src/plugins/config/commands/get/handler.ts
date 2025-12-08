import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { inferConfigOptionType } from '../../schema';
import { GetConfigOutput } from './output';
import { GetConfigInputSchema } from './input';

export async function getConfigOption(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;

  // Parse and validate arguments
  const validArgs = GetConfigInputSchema.parse(args.args);
  const name = validArgs.option;

  if (!name) {
    return {
      status: Status.Failure,
      errorMessage: 'Missing required --option parameter',
    };
  }

  try {
    const value = api.config.getOption(name);
    // Try to detect type against listOptions
    const descriptor = api.config.listOptions().find((o) => o.name === name);
    const type = inferConfigOptionType(descriptor?.type, value);

    const output: GetConfigOutput = {
      name,
      type,
      value: value,
      allowedValues: descriptor?.allowedValues,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError(`Failed to get option "${name}"`, error),
    };
  }
}
