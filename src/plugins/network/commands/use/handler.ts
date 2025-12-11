import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { formatError } from '../../../../core/utils/errors';
import { UseNetworkOutput } from './output';
import { Status } from '../../../../core/shared/constants';
import { UseNetworkInputSchema } from './input';
import { ERROR_MESSAGES } from '../../error-messages';

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
