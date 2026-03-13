/**
 * Config Plugin Manifest
 * Provides commands to list, get and set configuration options
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';

import {
  configGet,
  GET_CONFIG_TEMPLATE,
  GetConfigOutputSchema,
} from './commands/get';
import {
  configList,
  LIST_CONFIG_TEMPLATE,
  ListConfigOutputSchema,
} from './commands/list';
import {
  configSet,
  SET_CONFIG_TEMPLATE,
  SetConfigOutputSchema,
} from './commands/set';

export const configPluginManifest: PluginManifest = {
  name: 'config',
  version: '1.0.0',
  displayName: 'Configuration Plugin',
  description: 'Manage CLI configuration options',
  skipWizardInitialization: true,
  commands: [
    {
      name: 'list',
      summary: 'List configuration options',
      description: 'List all configuration options with current values',
      options: [],
      handler: configList,
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
          type: OptionType.STRING,
          required: true,
          description: 'Option name to read',
        },
      ],
      handler: configGet,
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
          type: OptionType.STRING,
          required: true,
          description:
            'Option name to set. Use `list` command to check what options could be set',
        },
        {
          name: 'value',
          short: 'v',
          type: OptionType.STRING,
          required: true,
          description:
            'Value to set (boolean|number|string). Booleans: true/false.',
        },
      ],
      handler: configSet,
      output: {
        schema: SetConfigOutputSchema,
        humanTemplate: SET_CONFIG_TEMPLATE,
      },
    },
  ],
};

export default configPluginManifest;
