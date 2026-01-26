/**
 * Network Plugin Manifest
 * Defines the network plugin
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import {
  GET_OPERATOR_TEMPLATE,
  getOperatorHandler,
  GetOperatorOutputSchema,
} from './commands/get-operator';
import {
  LIST_NETWORKS_TEMPLATE,
  listHandler,
  ListNetworksOutputSchema,
} from './commands/list';
import {
  SET_OPERATOR_TEMPLATE,
  setOperatorHandler,
  SetOperatorOutputSchema,
} from './commands/set-operator';
import {
  USE_NETWORK_TEMPLATE,
  useHandler,
  UseNetworkOutputSchema,
} from './commands/use';

export const networkPluginManifest: PluginManifest = {
  name: 'network',
  version: '1.0.0',
  displayName: 'Network Plugin',
  description: 'Plugin for managing Hedera network configurations',
  commands: [
    {
      name: 'list',
      summary: 'List all available networks',
      description:
        'List all available networks with their configuration and health status',
      options: [],
      handler: listHandler,
      output: {
        schema: ListNetworksOutputSchema,
        humanTemplate: LIST_NETWORKS_TEMPLATE,
      },
    },
    {
      name: 'use',
      summary: 'Switch to a specific network',
      description: 'Switch the active network to the specified network name',
      options: [
        {
          name: 'global',
          short: 'g',
          type: 'string',
          required: true,
          description: 'Network name (testnet, mainnet, previewnet, localnet)',
        },
      ],
      handler: useHandler,
      output: {
        schema: UseNetworkOutputSchema,
        humanTemplate: USE_NETWORK_TEMPLATE,
      },
    },
    {
      name: 'get-operator',
      summary: 'Get operator for a network',
      description: 'Get operator credentials for a specific network',
      options: [],
      handler: getOperatorHandler,
      output: {
        schema: GetOperatorOutputSchema,
        humanTemplate: GET_OPERATOR_TEMPLATE,
      },
    },
    {
      name: 'set-operator',
      summary: 'Set operator for a network',
      description:
        'Set operator credentials for signing transactions on a specific network',
      options: [
        {
          name: 'operator',
          short: 'o',
          type: 'string',
          required: true,
          description:
            'Operator credentials: name or account-id:private-key pair',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: setOperatorHandler,
      output: {
        schema: SetOperatorOutputSchema,
        humanTemplate: SET_OPERATOR_TEMPLATE,
      },
    },
  ],
};

export default networkPluginManifest;
