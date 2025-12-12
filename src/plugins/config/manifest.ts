/**
 * Config Plugin Manifest
 * Provides commands to list, get and set configuration options
 */
import type { PluginManifest } from '@/core';

import {
  GET_CONFIG_TEMPLATE,
  getConfigOption,
  GetConfigOutputSchema,
} from './commands/get';
import {
  LIST_CONFIG_TEMPLATE,
  listConfigOptions,
  ListConfigOutputSchema,
} from './commands/list';
import {
  SET_CONFIG_TEMPLATE,
  setConfigOption,
  SetConfigOutputSchema,
} from './commands/set';

export const configPluginManifest: PluginManifest = {
  name: 'config',
  version: '1.0.0',
  displayName: 'Configuration Plugin',
  description: 'Manage CLI configuration options',
  compatibility: {
    cli: '^1.0.0',
    core: '^1.0.0',
    api: '^1.0.0',
  },
  capabilities: ['config:read', 'config:write'],
  commands: [
    {
      name: 'list',
      summary: 'List configuration options',
      description: 'List all configuration options with current values',
      options: [],
      handler: listConfigOptions,
      output: {
        schema: ListConfigOutputSchema,
        humanTemplate: LIST_CONFIG_TEMPLATE,
      },
    },
    {
      name: 'get',
      summary: 'Get a configuration option',
      description: 'Get the value of a configuration option',
      options: [
        {
          name: 'option',
          short: 'o',
          type: 'string',
          required: true,
          description: 'Option name to read',
        },
      ],
      handler: getConfigOption,
      output: {
        schema: GetConfigOutputSchema,
        humanTemplate: GET_CONFIG_TEMPLATE,
      },
    },
    {
      name: 'set',
      summary: 'Set a configuration option',
      description: 'Set the value of a configuration option',
      options: [
        {
          name: 'option',
          short: 'o',
          type: 'string',
          required: true,
          description:
            'Option name to set. Use `list` command to check what options could be set',
        },
        {
          name: 'value',
          short: 'v',
          type: 'string',
          required: true,
          description:
            'Value to set (boolean|number|string). Booleans: true/false.',
        },
      ],
      handler: setConfigOption,
      output: {
        schema: SetConfigOutputSchema,
        humanTemplate: SET_CONFIG_TEMPLATE,
      },
    },
  ],
  stateSchemas: [],
  init: () => {
    console.log('[CONFIG PLUGIN] Initializing config plugin...');
  },
  teardown: () => {
    console.log('[CONFIG PLUGIN] Tearing down config plugin...');
  },
};

export default configPluginManifest;
