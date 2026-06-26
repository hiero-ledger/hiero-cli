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
          name: 'default_key_manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Set default key manager - allowed values: local | local_encrypted',
        },
        {
          name: 'ed25519_support',
          short: 'e',
          type: OptionType.STRING,
          required: false,
          description: 'Set ed25519 support - true or false',
        },
        {
          name: 'log_level',
          short: 'l',
          type: OptionType.STRING,
          required: false,
          description:
            'Set log level - allowed values: silent | error | warn | info | debug',
        },
        {
          name: 'skip_confirmations',
          short: 'c',
          type: OptionType.STRING,
          required: false,
          description: 'Set skip confirmations - true or false',
        },
        {
          name: 'default_max_transaction_fee',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Set default max transaction fee ceiling applied to every client. HBAR (e.g. "20") or tinybars ("200000000t"). Set to 0 to clear the setting.',
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
