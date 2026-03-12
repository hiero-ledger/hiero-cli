import type { CommandHandlerArgs, CommandResult } from '@/core';
import type {
  FooBuildTransactionResult,
  FooNormalizedParams,
  FooSignTransactionResult,
} from '@/plugins/test/commands/foo/types';
import type { FooTestOutput } from './output';

import { BaseTransactionCommand } from '@/core/commands/command';
import { FooTestInputSchema } from '@/plugins/test/commands/foo/input';

export const TEST_FOO_COMMAND_NAME = 'test_foo';

export class TestFooCommand extends BaseTransactionCommand<
  FooNormalizedParams,
  FooBuildTransactionResult,
  FooSignTransactionResult,
  void
> {
  constructor() {
    super(TEST_FOO_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<FooNormalizedParams> {
    const validArgs = FooTestInputSchema.parse(args.args);
    return {
      message: validArgs.message,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: FooNormalizedParams,
  ): Promise<FooBuildTransactionResult> {
    void args;
    return { message: normalisedParams.message };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: FooNormalizedParams,
    buildTransactionResult: FooBuildTransactionResult,
  ): Promise<FooSignTransactionResult> {
    void args;
    void normalisedParams;
    return { message: buildTransactionResult.message };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: FooNormalizedParams,
    buildTransactionResult: FooBuildTransactionResult,
    signTransactionResult: FooSignTransactionResult,
  ): Promise<void> {
    void normalisedParams;
    void buildTransactionResult;
    const { logger } = args;
    logger.info(signTransactionResult.message);
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: FooNormalizedParams,
    buildTransactionResult: FooBuildTransactionResult,
    signTransactionResult: FooSignTransactionResult,
    executeTransactionResult: void,
  ): Promise<CommandResult> {
    void args;
    void buildTransactionResult;
    void signTransactionResult;
    void executeTransactionResult;
    const output: FooTestOutput = {
      bar: normalisedParams.message,
    };
    return { result: output };
  }
}

export async function fooTestOptions(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TestFooCommand().execute(args);
}

export async function testFoo(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TestFooCommand().execute(args);
}
