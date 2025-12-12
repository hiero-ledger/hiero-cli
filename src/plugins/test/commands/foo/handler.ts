import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { CommandExecutionResult } from '@/core/plugins/plugin.types';
import type { FooTestOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

export async function fooTestOptions(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger } = args;
  try {
    logger.info('Test Foo');
    const output: FooTestOutput = {
      bar: 'Foo',
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
