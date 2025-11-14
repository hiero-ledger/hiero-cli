import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { formatError } from '../../../../core/utils/errors';
import { UseNetworkOutput } from './output';
import { SupportedNetwork } from '../../../../core/types/shared.types';
import { Status } from '../../../../core/shared/constants';

export async function useHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;

  const network = args.args.network as SupportedNetwork | undefined;
  if (!network) {
    return {
      status: Status.Failure,
      errorMessage: 'Network name is required. Use --network <name>',
    };
  }

  logger.verbose(`Switching to network: ${network}`);

  try {
    api.network.switchNetwork(network);

    const output: UseNetworkOutput = {
      activeNetwork: network,
    };
    return { status: Status.Success, outputJson: JSON.stringify(output) };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to switch network', error),
    };
  }
}
