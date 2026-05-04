import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { SwapDeleteOutput } from './output';

import { SwapStateHelper } from '@/plugins/swap/state-helper';

import { SwapDeleteInputSchema } from './input';

export async function swapDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = SwapDeleteInputSchema.parse(args.args);
  const { name } = validArgs;

  const helper = new SwapStateHelper(api.state);
  helper.getSwapOrThrow(name);
  helper.deleteSwap(name);

  const output: SwapDeleteOutput = { name };

  return { result: output };
}
