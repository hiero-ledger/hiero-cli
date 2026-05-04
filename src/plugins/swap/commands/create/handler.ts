import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { SwapCreateOutput } from './output';

import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { SwapStateHelper } from '@/plugins/swap/state-helper';

import { SwapCreateInputSchema } from './input';

export async function swapCreate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const validArgs = SwapCreateInputSchema.parse(args.args);
  const { name, memo } = validArgs;

  const helper = new SwapStateHelper(api.state);
  helper.assertDoesNotExist(name);

  helper.saveSwap(name, { memo, transfers: [] });

  const output: SwapCreateOutput = {
    name,
    transferCount: 0,
    maxTransfers: HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
    memo,
  };

  return { result: output };
}
