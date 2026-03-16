/**
 * Network Plugin Manifest
 * Defines the network plugin
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import { OptionType } from '@/core/types/shared.types';

import {
  NETWORK_GET_OPERATOR_TEMPLATE,
  networkGetOperator,
  NetworkGetOperatorOutputSchema,
} from './commands/get-operator';
import {
  NETWORK_LIST_TEMPLATE,
  networkList,
  NetworkListOutputSchema,
} from './commands/list';
import {
  NETWORK_SET_OPERATOR_TEMPLATE,
  networkSetOperator,
  NetworkSetOperatorOutputSchema,
} from './commands/set-operator';
import {
  NETWORK_USE_TEMPLATE,
  networkUse,
  NetworkUseOutputSchema,
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
      handler: networkList,
      output: {
        schema: NetworkListOutputSchema,
        humanTemplate: NETWORK_LIST_TEMPLATE,
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
      handler: networkUse,
      output: {
        schema: NetworkUseOutputSchema,
        humanTemplate: NETWORK_USE_TEMPLATE,
      },
    },
    {
      name: 'get-operator',
      summary: 'Get operator for a network',
      description: 'Get operator credentials for a specific network',
      options: [],
      handler: networkGetOperator,
      output: {
        schema: NetworkGetOperatorOutputSchema,
        humanTemplate: NETWORK_GET_OPERATOR_TEMPLATE,
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
      handler: networkSetOperator,
      output: {
        schema: NetworkSetOperatorOutputSchema,
        humanTemplate: NETWORK_SET_OPERATOR_TEMPLATE,
      },
    },
  ],
};

export default networkPluginManifest;
