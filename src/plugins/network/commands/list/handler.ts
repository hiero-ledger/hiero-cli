import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { CommandResult } from '@/core/plugins/plugin.types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { ListNetworksOutput } from './output';

import {
  checkMirrorNodeHealth,
  checkRpcHealth,
} from '@/plugins/network/utils/networkHealth';

export async function listHandler(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;

  const networkNames = api.network.getAvailableNetworks();
  const currentNetwork = api.network.getCurrentNetwork();

  const networks = await Promise.all(
    networkNames.map(async (name) => {
      const networkName = name as SupportedNetwork;
      const config = api.network.getNetworkConfig(networkName);
      const operator = api.network.getOperator(networkName);

      let mirrorNodeHealth;
      let rpcHealth;

      if (networkName === currentNetwork) {
        mirrorNodeHealth = await checkMirrorNodeHealth(config.mirrorNodeUrl);
        rpcHealth = await checkRpcHealth(config.rpcUrl);
      }

      return {
        name: networkName,
        isActive: networkName === currentNetwork,
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

  return { result: output };
}
