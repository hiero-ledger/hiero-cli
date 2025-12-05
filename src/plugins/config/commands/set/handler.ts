import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { inferConfigOptionType } from '../../schema';
import { SetConfigOutput } from './output';
import { SetConfigInputSchema } from './input';

export async function setConfigOption(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;

  // Parse and validate arguments
  const validArgs = SetConfigInputSchema.parse(args.args);

  const name = validArgs.option;
  const value = validArgs.value;

  if (!name) {
    return {
      status: Status.Failure,
      errorMessage: 'Missing required --option parameter',
    };
  }
  if (value === undefined) {
    return {
      status: Status.Failure,
      errorMessage: 'Missing required --value parameter',
    };
  }

  try {
    const prev = api.config.getOption(name);
    const descriptor = api.config.listOptions().find((o) => o.name === name);
    const type = inferConfigOptionType(descriptor?.type, value);
    api.config.setOption(name, value);
    const output: SetConfigOutput = {
      name,
      type,
      previousValue: prev as SetConfigOutput['previousValue'],
      newValue: value,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError(`Failed to set option "${name}"`, error),
    };
  }
}
