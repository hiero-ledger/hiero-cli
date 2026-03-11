import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ListNetworksOutput } from './output';
import type {
  ListNetworksExecuteResult,
  ListNetworksNormalisedParams,
} from './types';

import {
  checkMirrorNodeHealth,
  checkRpcHealth,
} from '@/plugins/network/utils/networkHealth';

const normalizeParams = (
  args: CommandHandlerArgs,
): ListNetworksNormalisedParams => ({
  currentNetwork: args.api.network.getCurrentNetwork(),
  networkNames:
    args.api.network.getAvailableNetworks() as ListNetworksNormalisedParams['networkNames'],
});

export class ListNetworksCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const normalisedParams = normalizeParams(args);

    const networks: ListNetworksExecuteResult = await Promise.all(
      normalisedParams.networkNames.map(async (networkName) => {
        const config = api.network.getNetworkConfig(networkName);
        const operator = api.network.getOperator(networkName);

        let mirrorNodeHealth;
        let rpcHealth;

        if (networkName === normalisedParams.currentNetwork) {
          mirrorNodeHealth = await checkMirrorNodeHealth(config.mirrorNodeUrl);
          rpcHealth = await checkRpcHealth(config.rpcUrl);
        }

        return {
          name: networkName,
          isActive: networkName === normalisedParams.currentNetwork,
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
      activeNetwork: normalisedParams.currentNetwork,
    };

    return { result: output };
  }
}
