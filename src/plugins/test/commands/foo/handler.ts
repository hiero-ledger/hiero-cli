import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { FooNormalizedParams } from '@/plugins/test/commands/foo/types';
import type { FooTestOutput } from './output';

import { BaseTransactionCommand } from '@/core/commands/command';
import { FooTestInputSchema } from '@/plugins/test/commands/foo/input';

interface FooBuildAndSignResult {
  message: string;
}

export class FooTestCommand extends BaseTransactionCommand<
  FooNormalizedParams,
  FooBuildAndSignResult,
  void
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<FooNormalizedParams> {
    const validArgs = FooTestInputSchema.parse(args.args);
    return {
      message: validArgs.message,
    };
  }

  async buildAndSign(
    args: CommandHandlerArgs,
    normalisedParams: FooNormalizedParams,
  ): Promise<FooBuildAndSignResult> {
    void args;
    return { message: normalisedParams.message };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: FooNormalizedParams,
    buildAndSignResult: FooBuildAndSignResult,
  ): Promise<void> {
    const { logger } = args;
    logger.info(buildAndSignResult.message);
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: FooNormalizedParams,
  ): Promise<CommandResult> {
    void args;
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
