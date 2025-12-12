import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { UseNetworkOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ERROR_MESSAGES } from '@/plugins/network/error-messages';

import { UseNetworkInputSchema } from './input';

export async function useHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;

  // Parse and validate args
  const validArgs = UseNetworkInputSchema.parse(args.args);

  const network = validArgs.network;

  logger.info(`Switching to network: ${network}`);

  try {
    api.network.switchNetwork(network);

    const output: UseNetworkOutput = {
      activeNetwork: network,
    };
    return { status: Status.Success, outputJson: JSON.stringify(output) };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError(ERROR_MESSAGES.failedToSwitchNetwork, error),
    };
  }
}
