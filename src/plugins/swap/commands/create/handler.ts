import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { SwapCreateOutput } from './output';

import { ValidationError } from '@/core/errors';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandSwapStateHelper } from '@/plugins/swap/zustand-state-helper';

import { SwapCreateInputSchema } from './input';

export class SwapCreateCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const swapState = new ZustandSwapStateHelper(api.state, logger);
    const validArgs = SwapCreateInputSchema.parse(args.args);
    const { name } = validArgs;
    const network = api.network.getCurrentNetwork();
    const key = composeKey(network, name);

    if (swapState.hasSwap(key)) {
      throw new ValidationError(
        `Swap with name '${name}' already exists on ${network}`,
      );
    }

    const createdAt = new Date().toISOString();

    swapState.saveSwap(key, {
      name,
      network,
      executed: false,
      createdAt,
      transfers: [],
    });

    logger.info(`[SWAP] Created swap '${name}' on ${network}`);

    const output: SwapCreateOutput = { name, network, createdAt };
    return { result: output };
  }
}

export async function swapCreate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SwapCreateCommand().execute(args);
}
