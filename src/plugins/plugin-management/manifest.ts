/**
 * Plugin Management Plugin Manifest
 * A plugin for managing other plugins
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

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

export const pluginManagementManifest: PluginManifest = {
  name: 'plugin-management',
  version: '1.0.0',
  displayName: 'Plugin Management',
  description: 'Plugin for managing other CLI plugins',
  commands: [
    {
      name: 'add',
      summary: 'Add a plugin from path',
      description:
        'Add a new plugin to the plugin-management state and enable it',
      options: [
        {
          name: 'path',
          short: 'p',
          type: 'string',
          required: true,
          description:
            'Filesystem path to the plugin directory containing manifest.js',
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
          type: 'string',
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
          type: 'string',
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
          type: 'string',
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
      name: 'info',
      summary: 'Get plugin information',
      description: 'Show detailed information about a specific plugin',
      options: [
        {
          name: 'name',
          short: 'n',
          type: 'string',
          required: true,
          description:
            'Name of the plugin for information display. Option required.',
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
