import type { CommandHandlerArgs } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { CommandResult } from '@/core/plugins/plugin.types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { UseNetworkOutput } from './output';
import type { UseNetworkNormalisedParams } from './types';

import { UseNetworkInputSchema } from './input';

const normalizeParams = (
  args: CommandHandlerArgs,
): UseNetworkNormalisedParams => {
  const validArgs = UseNetworkInputSchema.parse(args.args);

  return {
    network: (validArgs.global || validArgs.g) as SupportedNetwork,
  };
};

export class UseNetworkCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { logger, api } = args;
    const normalisedParams = normalizeParams(args);

    logger.info(`Switching to network: ${normalisedParams.network}`);
    api.network.switchNetwork(normalisedParams.network);

    const output: UseNetworkOutput = {
      activeNetwork: normalisedParams.network,
    };

    return { result: output };
  }
}
