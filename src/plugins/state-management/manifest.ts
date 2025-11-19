/**
 * State Management Plugin Manifest
 * A plugin for managing state data across all plugins
 * Compliant with ADR-003: Result-Oriented Command Handler Contract
 */
import { PluginManifest } from '../../core/plugins/plugin.interface';
import { ListStateOutputSchema, LIST_STATE_TEMPLATE } from './commands/list';
import { ClearStateOutputSchema, CLEAR_STATE_TEMPLATE } from './commands/clear';
import { StateInfoOutputSchema, STATE_INFO_TEMPLATE } from './commands/info';
import {
  StateBackupOutputSchema,
  STATE_BACKUP_TEMPLATE,
} from './commands/backup';
import { StateStatsOutputSchema, STATE_STATS_TEMPLATE } from './commands/stats';
import { listState } from './commands/list/handler';
import { clearState } from './commands/clear/handler';
import { stateInfo } from './commands/info/handler';
import { stateBackup } from './commands/backup/handler';
import { stateStats } from './commands/stats/handler';

export const stateManagementManifest: PluginManifest = {
  name: 'state-management',
  version: '1.0.0',
  displayName: 'State Management',
  description: 'Manage state data for all plugins',
  compatibility: {
    cli: '>=1.0.0',
    core: '>=1.0.0',
    api: '>=1.0.0',
  },
  capabilities: ['state:manage', 'state:backup', 'state:restore'],
  commands: [
    {
      name: 'list',
      summary: 'List all state data',
      description: 'Show all stored state data across plugins',
      options: [
        { name: 'namespace', short: 'n', type: 'string', required: false },
      ],
      handler: listState,
      output: {
        schema: ListStateOutputSchema,
        humanTemplate: LIST_STATE_TEMPLATE,
      },
    },
    {
      name: 'clear',
      summary: 'Clear state data',
      description: 'Clear state data for a specific namespace or all data',
      options: [
        { name: 'namespace', short: 'n', type: 'string', required: false },
        { name: 'confirm', short: 'c', type: 'boolean', required: false },
      ],
      handler: clearState,
      output: {
        schema: ClearStateOutputSchema,
        humanTemplate: CLEAR_STATE_TEMPLATE,
      },
    },
    {
      name: 'info',
      summary: 'Show state information',
      description: 'Display information about stored state data',
      handler: stateInfo,
      output: {
        schema: StateInfoOutputSchema,
        humanTemplate: STATE_INFO_TEMPLATE,
      },
    },
    {
      name: 'backup',
      summary: 'Create state backup',
      description: 'Create a backup of all state data',
      options: [
        {
          name: 'dest',
          short: 'd',
          type: 'string',
          required: false,
          description: 'Destination file path for the backup file',
        },
      ],
      handler: stateBackup,
      output: {
        schema: StateBackupOutputSchema,
        humanTemplate: STATE_BACKUP_TEMPLATE,
      },
    },
    {
      name: 'stats',
      summary: 'Show state statistics',
      description: 'Display detailed statistics about stored state data',
      handler: stateStats,
      output: {
        schema: StateStatsOutputSchema,
        humanTemplate: STATE_STATS_TEMPLATE,
      },
    },
  ],
};

export default stateManagementManifest;
