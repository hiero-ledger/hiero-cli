import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { SwapDeleteOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandSwapStateHelper } from '@/plugins/swap/zustand-state-helper';

import { SwapDeleteInputSchema } from './input';

export class SwapDeleteCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const swapState = new ZustandSwapStateHelper(api.state, logger);
    const validArgs = SwapDeleteInputSchema.parse(args.args);
    const { name } = validArgs;

    const network = api.network.getCurrentNetwork();
    const key = composeKey(network, name);

    const swapData = swapState.getSwap(key);
    if (!swapData) {
      throw new NotFoundError(`Swap not found: '${name}'`, {
        context: { name },
      });
    }

    if (swapData.executed) {
      logger.warn(
        `[SWAP] Deleting already-executed swap '${name}'. The on-chain transaction is settled.`,
      );
    }

    swapState.deleteSwap(key);
    logger.info(`[SWAP] Deleted swap '${name}'`);

    const output: SwapDeleteOutput = { name };
    return { result: output };
  }
}

export async function swapDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SwapDeleteCommand().execute(args);
}
