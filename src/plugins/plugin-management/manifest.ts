/**
 * Plugin Management Plugin Manifest
 * A plugin for managing other plugins
 */
import { PluginManifest } from '../../core/plugins/plugin.interface';
import {
  AddPluginOutputSchema,
  ADD_PLUGIN_TEMPLATE,
} from './commands/add/output';
import {
  RemovePluginOutputSchema,
  REMOVE_PLUGIN_TEMPLATE,
} from './commands/remove/output';
import {
  EnablePluginOutputSchema,
  ENABLE_PLUGIN_TEMPLATE,
} from './commands/enable/output';
import {
  DisablePluginOutputSchema,
  DISABLE_PLUGIN_TEMPLATE,
} from './commands/disable/output';
import {
  ListPluginsOutputSchema,
  LIST_PLUGINS_TEMPLATE,
} from './commands/list/output';
import {
  PluginInfoOutputSchema,
  PLUGIN_INFO_TEMPLATE,
} from './commands/info/output';
import { addPlugin } from './commands/add/handler';
import { removePlugin } from './commands/remove/handler';
import { enablePlugin } from './commands/enable/handler';
import { disablePlugin } from './commands/disable/handler';
import { getPluginList } from './commands/list/handler';
import { getPluginInfo } from './commands/info/handler';

export const pluginManagementManifest: PluginManifest = {
  name: 'plugin-management',
  version: '1.0.0',
  displayName: 'Plugin Management',
  description: 'Plugin for managing other CLI plugins',
  compatibility: {
    cli: '>=1.0.0',
    core: '>=1.0.0',
    api: '>=1.0.0',
  },
  capabilities: ['plugin:manage', 'plugin:list', 'plugin:info'],
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
