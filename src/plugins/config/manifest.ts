/**
 * Config Plugin Manifest
 * Provides commands to list, get and set configuration options
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';

import {
  CONFIG_GET_TEMPLATE,
  configGet,
  ConfigGetOutputSchema,
} from './commands/get';
import {
  CONFIG_LIST_TEMPLATE,
  configList,
  ConfigListOutputSchema,
} from './commands/list';
import {
  CONFIG_SET_TEMPLATE,
  configSet,
  ConfigSetOutputSchema,
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
        schema: ConfigListOutputSchema,
        humanTemplate: CONFIG_LIST_TEMPLATE,
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
        schema: ConfigGetOutputSchema,
        humanTemplate: CONFIG_GET_TEMPLATE,
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
        schema: ConfigSetOutputSchema,
        humanTemplate: CONFIG_SET_TEMPLATE,
      },
    },
  ],
};

export default configPluginManifest;
