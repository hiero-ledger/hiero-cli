/**
 * Network Plugin Manifest
 * Defines the network plugin
 */
import { PluginManifest } from '../../core/plugins/plugin.interface';
import {
  ListNetworksOutputSchema,
  LIST_NETWORKS_TEMPLATE,
} from './commands/list';
import { UseNetworkOutputSchema, USE_NETWORK_TEMPLATE } from './commands/use';
import { listHandler } from './commands/list/handler';
import { useHandler } from './commands/use';
import {
  GetOperatorOutputSchema,
  GET_OPERATOR_TEMPLATE,
} from './commands/get-operator/index';
import { getOperatorHandler } from './commands/get-operator/handler';
import {
  SetOperatorOutputSchema,
  SET_OPERATOR_TEMPLATE,
} from './commands/set-operator/index';
import { setOperatorHandler } from './commands/set-operator/handler';

export const networkPluginManifest: PluginManifest = {
  name: 'network',
  version: '1.0.0',
  displayName: 'Network Plugin',
  description: 'Plugin for managing Hedera network configurations',
  compatibility: {
    cli: '^1.0.0',
    core: '^1.0.0',
    api: '^1.0.0',
  },
  capabilities: ['state:read', 'state:write', 'config:read'],
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
          name: 'network',
          short: 'N',
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
      options: [
        {
          name: 'network',
          short: 'N',
          type: 'string',
          required: false,
          description: 'Target network (defaults to current network)',
        },
      ],
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
          name: 'network',
          short: 'N',
          type: 'string',
          required: false,
          description: 'Target network (defaults to current network)',
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
