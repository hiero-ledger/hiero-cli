import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { FooTestOutput } from './output';

import { FooTestInputSchema } from '@/plugins/test/commands/foo/input';

export async function fooTestOptions(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { logger } = args;

  const validArgs = FooTestInputSchema.parse(args.args);
  const message = validArgs.message;

  logger.info(message);

  const output: FooTestOutput = {
    bar: message,
  };

  return { result: output };
}
