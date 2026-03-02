import type { CommandHandlerArgs } from '@/core';
import type { CommandResult } from '@/core/plugins/plugin.types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { UseNetworkOutput } from './output';

import { UseNetworkInputSchema } from './input';

export async function useHandler(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { logger, api } = args;

  const validArgs = UseNetworkInputSchema.parse(args.args);

  const network = (validArgs.global || validArgs.g) as SupportedNetwork;

  logger.info(`Switching to network: ${network}`);

  api.network.switchNetwork(network);

  const output: UseNetworkOutput = {
    activeNetwork: network,
  };

  return { result: output };
}
