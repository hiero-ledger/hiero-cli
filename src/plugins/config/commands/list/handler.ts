import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { CommandExecutionResult } from '@/core/plugins/plugin.types';
import type { ListConfigOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

export async function listConfigOptions(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;
  try {
    const options = api.config.listOptions();
    const output: ListConfigOutput = {
      options,
      totalCount: options.length,
    };
    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to list configuration options', error),
    };
  }
}
