import type { CommandHandlerArgs } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { CommandResult } from '@/core/plugins/plugin.types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { UseNetworkOutput } from './output';
import type { UseNetworkNormalisedParams } from './types';

import { NetworkUseInputSchema } from './input';

const normalizeParams = (
  args: CommandHandlerArgs,
): UseNetworkNormalisedParams => {
  const validArgs = NetworkUseInputSchema.parse(args.args);

  return {
    network: (validArgs.global || validArgs.g) as SupportedNetwork,
  };
};

export class NetworkUseCommand implements Command {
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

export const networkUse = async (
  args: CommandHandlerArgs,
): Promise<CommandResult> => new NetworkUseCommand().execute(args);
