/**
 * Network Plugin Manifest
 * Defines the network plugin
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import { OptionType } from '@/core/types/shared.types';

import {
  GET_OPERATOR_TEMPLATE,
  getOperator,
  GetOperatorOutputSchema,
} from './commands/get-operator';
import {
  LIST_NETWORKS_TEMPLATE,
  listNetworks,
  ListNetworksOutputSchema,
} from './commands/list';
import {
  SET_OPERATOR_TEMPLATE,
  setOperator,
  SetOperatorOutputSchema,
} from './commands/set-operator';
import {
  USE_NETWORK_TEMPLATE,
  useNetwork,
  UseNetworkOutputSchema,
} from './commands/use';

export const networkPluginManifest: PluginManifest = {
  name: 'network',
  version: '1.0.0',
  displayName: 'Network Plugin',
  description: 'Plugin for managing Hedera network configurations',
  skipWizardInitialization: true,
  commands: [
    {
      name: 'list',
      summary: 'List all available networks',
      description:
        'List all available networks with their configuration and health status',
      options: [],
      handler: listNetworks,
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
          type: OptionType.STRING,
          required: true,
          description: 'Network name (testnet, mainnet, previewnet, localnet)',
        },
      ],
      handler: useNetwork,
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
      handler: getOperator,
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
          type: OptionType.STRING,
          required: true,
          description:
            'Operator credentials. Can be accountId:privateKey pair, key reference or account alias',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: setOperator,
      output: {
        schema: SetOperatorOutputSchema,
        humanTemplate: SET_OPERATOR_TEMPLATE,
      },
    },
  ],
};

export default networkPluginManifest;
