import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Context } from '@/core/shared/context/context';
import type { FooNormalizedParams } from '@/plugins/test/commands/foo/types';
import type { FooTestOutput } from './output';

import { BaseCommand } from '@/core/commands/command';
import { FooTestInputSchema } from '@/plugins/test/commands/foo/input';

export class FooTestCommand extends BaseCommand<FooNormalizedParams, void> {
  async normalizeParams(
    args: CommandHandlerArgs,
    _context: Context,
  ): Promise<FooNormalizedParams> {
    void _context;
    const validArgs = FooTestInputSchema.parse(args.args);
    return {
      message: validArgs.message,
    };
  }

  async coreAction(
    args: CommandHandlerArgs,
    _context: Context,
    normalisedParams: FooNormalizedParams,
  ): Promise<void> {
    void _context;
    const { logger } = args;
    logger.info(normalisedParams.message);
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    _context: Context,
    normalisedParams: FooNormalizedParams,
  ): Promise<CommandResult> {
    void _context;
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
