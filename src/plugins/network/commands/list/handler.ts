import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { formatError } from '../../../../core/utils/errors';
import { Status } from '../../../../core/shared/constants';
import {
  checkMirrorNodeHealth,
  checkRpcHealth,
} from '../../utils/networkHealth';
import { ListNetworksOutput } from './output';
import { SupportedNetwork } from '../../../../core/types/shared.types';

export async function listHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;

  try {
    const networkNames = api.network.getAvailableNetworks();
    const currentNetwork = api.network.getCurrentNetwork();

    const networks = await Promise.all(
      networkNames.map(async (name) => {
        const config = api.network.getNetworkConfig(name as SupportedNetwork);
        const operator = api.network.getOperator(name as SupportedNetwork);

        let mirrorNodeHealth;
        let rpcHealth;

        if (name === currentNetwork) {
          mirrorNodeHealth = await checkMirrorNodeHealth(config.mirrorNodeUrl);
          rpcHealth = await checkRpcHealth(config.rpcUrl);
        }

        return {
          name: name as SupportedNetwork,
          isActive: name === currentNetwork,
          mirrorNodeUrl: config.mirrorNodeUrl,
          rpcUrl: config.rpcUrl,
          operatorId: operator?.accountId || '',
          mirrorNodeHealth,
          rpcHealth,
        };
      }),
    );

    const output: ListNetworksOutput = {
      networks,
      activeNetwork: currentNetwork,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error) {
    const errorMessage = formatError('Failed to list networks', error);
    return {
      status: Status.Failure,
      errorMessage,
    };
  }
}
