/**
 * Plugin Management Plugin Manifest
 * A plugin for managing other plugins
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import { OptionType } from '@/core/types/shared.types';

import {
  ADD_PLUGIN_TEMPLATE,
  addPlugin,
  AddPluginOutputSchema,
} from './commands/add';
import {
  DISABLE_PLUGIN_TEMPLATE,
  disablePlugin,
  DisablePluginOutputSchema,
} from './commands/disable';
import {
  ENABLE_PLUGIN_TEMPLATE,
  enablePlugin,
  EnablePluginOutputSchema,
} from './commands/enable';
import {
  getPluginInfo,
  PLUGIN_INFO_TEMPLATE,
  PluginInfoOutputSchema,
} from './commands/info';
import {
  getPluginList,
  LIST_PLUGINS_TEMPLATE,
  ListPluginsOutputSchema,
} from './commands/list';
import {
  REMOVE_PLUGIN_TEMPLATE,
  removePlugin,
  RemovePluginOutputSchema,
} from './commands/remove';
import {
  RESET_PLUGINS_TEMPLATE,
  resetPlugins,
  ResetPluginsOutputSchema,
} from './commands/reset';

export const pluginManagementManifest: PluginManifest = {
  name: 'plugin-management',
  version: '1.0.0',
  displayName: 'Plugin Management',
  description: 'Plugin for managing other CLI plugins',
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
      handler: addPlugin,
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
      handler: removePlugin,
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
      handler: enablePlugin,
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
      handler: disablePlugin,
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
      handler: getPluginList,
      output: {
        schema: ListPluginsOutputSchema,
        humanTemplate: LIST_PLUGINS_TEMPLATE,
      },
    },
    {
      name: 'reset',
      summary: 'Reset plugin state to defaults',
      description:
        'Clear plugin-management state. All default plugins will be restored on next CLI run. Custom plugins will be removed.',
      options: [],
      handler: resetPlugins,
      output: {
        schema: ResetPluginsOutputSchema,
        humanTemplate: RESET_PLUGINS_TEMPLATE,
      },
      requireConfirmation:
        'Are you sure you want to reset plugin state? All default plugins will be restored on next CLI run. Custom plugins will be removed.',
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
      handler: getPluginInfo,
      output: {
        schema: PluginInfoOutputSchema,
        humanTemplate: PLUGIN_INFO_TEMPLATE,
      },
    },
  ],
};

export default pluginManagementManifest;
