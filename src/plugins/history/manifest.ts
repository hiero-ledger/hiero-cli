/**
 * History Plugin Manifest
 * Provides commands for viewing transaction history using Mirror Node API
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import {
  LIST_HISTORY_TEMPLATE,
  listHistoryHandler,
  ListHistoryOutputSchema,
} from './commands/list';

export const historyPluginManifest: PluginManifest = {
  name: 'history',
  version: '1.0.0',
  displayName: 'History Plugin',
  description:
    'Transaction history commands for viewing account activity via Mirror Node',
  compatibility: {
    cli: '^1.0.0',
    core: '^1.0.0',
    api: '^1.0.0',
  },
  commands: [
    {
      name: 'list',
      summary: 'List transaction history for an account',
      description:
        'Query the Mirror Node to display recent transactions for a Hedera account. ' +
        'Supports filtering by transaction type and result.',
      options: [
        {
          name: 'account',
          short: 'a',
          type: 'string',
          required: true,
          description: 'Account ID, EVM address, or name to get history for',
        },
        {
          name: 'limit',
          short: 'l',
          type: 'number',
          required: false,
          default: 25,
          description: 'Maximum number of transactions to return (1-100)',
        },
        {
          name: 'type',
          short: 't',
          type: 'string',
          required: false,
          description:
            'Filter by transaction type: cryptotransfer, tokenassociate, tokendissociate, tokentransfers, contractcall, contractcreate',
        },
        {
          name: 'result',
          short: 'r',
          type: 'string',
          required: false,
          default: 'all',
          description: 'Filter by result: all, success, fail',
        },
      ],
      handler: listHistoryHandler,
      output: {
        schema: ListHistoryOutputSchema,
        humanTemplate: LIST_HISTORY_TEMPLATE,
      },
    },
  ],
};

export default historyPluginManifest;
