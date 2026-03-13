/**
 * Plugin Management Plugin Manifest
 * A plugin for managing other plugins
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import { OptionType } from '@/core/types/shared.types';

import {
  ADD_PLUGIN_TEMPLATE,
  AddPluginOutputSchema,
  pluginManagementAdd,
} from './commands/add';
import {
  DISABLE_PLUGIN_TEMPLATE,
  DisablePluginOutputSchema,
  pluginManagementDisable,
} from './commands/disable';
import {
  ENABLE_PLUGIN_TEMPLATE,
  EnablePluginOutputSchema,
  pluginManagementEnable,
} from './commands/enable';
import {
  PLUGIN_INFO_TEMPLATE,
  PluginInfoOutputSchema,
  pluginManagementInfo,
} from './commands/info';
import {
  LIST_PLUGINS_TEMPLATE,
  ListPluginsOutputSchema,
  pluginManagementList,
} from './commands/list';
import {
  pluginManagementRemove,
  REMOVE_PLUGIN_TEMPLATE,
  RemovePluginOutputSchema,
} from './commands/remove';
import {
  pluginManagementReset,
  RESET_PLUGINS_TEMPLATE,
  ResetPluginsOutputSchema,
} from './commands/reset';

export const pluginManagementManifest: PluginManifest = {
  name: 'plugin-management',
  version: '1.0.0',
  displayName: 'Plugin Management',
  description: 'Plugin for managing other CLI plugins',
  skipWizardInitialization: true,
  commands: [
    {
      name: 'add',
      summary: 'Add a plugin from path or by name',
      description:
        'Add a new plugin to the plugin-management state and enable it. Use --path for custom plugins, --name for default plugins.',
      options: [
        {
          name: 'path',
          short: 'p',
          type: OptionType.STRING,
          required: false,
          description:
            'Filesystem path to the plugin directory containing manifest.js',
        },
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: false,
          description:
            'Name of a default plugin to add (e.g. account, token). Use --path for custom plugins.',
        },
      ],
      handler: pluginManagementAdd,
      output: {
        schema: AddPluginOutputSchema,
        humanTemplate: ADD_PLUGIN_TEMPLATE,
      },
    },
    {
      name: 'remove',
      summary: 'Remove a plugin from state',
      description: 'Remove a plugin from the plugin-management state',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the plugin to remove from the state',
        },
      ],
      handler: pluginManagementRemove,
      output: {
        schema: RemovePluginOutputSchema,
        humanTemplate: REMOVE_PLUGIN_TEMPLATE,
      },
    },
    {
      name: 'enable',
      summary: 'Enable a plugin',
      description: 'Enable a plugin by name in the plugin-management state',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the plugin to enable',
        },
      ],
      handler: pluginManagementEnable,
      output: {
        schema: EnablePluginOutputSchema,
        humanTemplate: ENABLE_PLUGIN_TEMPLATE,
      },
    },
    {
      name: 'disable',
      summary: 'Disable a plugin',
      description: 'Disable a plugin by name in the plugin-management state',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the plugin to disable',
        },
      ],
      handler: pluginManagementDisable,
      output: {
        schema: DisablePluginOutputSchema,
        humanTemplate: DISABLE_PLUGIN_TEMPLATE,
      },
    },
    {
      name: 'list',
      summary: 'List all plugins',
      description: 'Show all loaded plugins',
      options: [],
      handler: pluginManagementList,
      output: {
        schema: ListPluginsOutputSchema,
        humanTemplate: LIST_PLUGINS_TEMPLATE,
      },
    },
    {
      name: 'reset',
      summary: 'Reset plugin state to defaults',
      description:
        'Clear plugin-management state. Custom plugins will be removed.',
      options: [],
      handler: pluginManagementReset,
      output: {
        schema: ResetPluginsOutputSchema,
        humanTemplate: RESET_PLUGINS_TEMPLATE,
      },
      requireConfirmation:
        'Are you sure you want to reset plugin state? Custom plugins will be removed.',
    },
    {
      name: 'info',
      summary: 'Get plugin information',
      description: 'Show detailed information about a specific plugin',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the plugin for information display',
        },
      ],
      handler: pluginManagementInfo,
      output: {
        schema: PluginInfoOutputSchema,
        humanTemplate: PLUGIN_INFO_TEMPLATE,
      },
    },
  ],
};

export default pluginManagementManifest;
