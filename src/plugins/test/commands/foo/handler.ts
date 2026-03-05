import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { FooNormalizedParams } from '@/plugins/test/commands/foo/types';
import type { FooTestOutput } from './output';

import { BaseCommand } from '@/core/commands/command';
import { FooTestInputSchema } from '@/plugins/test/commands/foo/input';

export class FooTestCommand extends BaseCommand<FooNormalizedParams, void> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<FooNormalizedParams> {
    const validArgs = FooTestInputSchema.parse(args.args);
    return {
      message: validArgs.message,
    };
  }

  async coreAction(
    args: CommandHandlerArgs,
    normalisedParams: FooNormalizedParams,
  ): Promise<void> {
    const { logger } = args;
    logger.info(normalisedParams.message);
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: FooNormalizedParams,
  ): Promise<CommandResult> {
    const output: FooTestOutput = {
      bar: normalisedParams.message,
    };
    return { result: output };
  }
}

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
