import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { CommandExecutionResult } from '@/core/plugins/plugin.types';
import type { FooTestOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { FooTestInputSchema } from '@/plugins/test/commands/foo/input';

export async function fooTestOptions(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger } = args;
  try {
    // Parse and validate args
    const validArgs = FooTestInputSchema.parse(args.args);
    const message = validArgs.message;
    logger.info(message);
    const output: FooTestOutput = {
      bar: message,
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
