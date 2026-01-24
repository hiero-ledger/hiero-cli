/**
 * Batch Plugin Manifest
 * Provides commands for batch operations (bulk transfers, airdrops, etc.)
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import {
  BATCH_HBAR_TRANSFER_TEMPLATE,
  batchHbarTransferHandler,
  BatchHbarTransferOutputSchema,
} from './commands/hbar-transfer';
import {
  BATCH_SUMMARY_TEMPLATE,
  batchSummaryHandler,
  BatchSummaryOutputSchema,
} from './commands/summary';
import {
  BATCH_TOKEN_TRANSFER_TEMPLATE,
  batchTokenTransferHandler,
  BatchTokenTransferOutputSchema,
} from './commands/token-transfer';

export const batchPluginManifest: PluginManifest = {
  name: 'batch',
  version: '1.0.0',
  displayName: 'Batch Plugin',
  description: 'Bulk operations for HBAR and token transfers from CSV files',
  compatibility: {
    cli: '^1.0.0',
    core: '^1.0.0',
    api: '^1.0.0',
  },
  commands: [
    {
      name: 'hbar-transfer',
      summary: 'Batch transfer HBAR from a CSV file',
      description:
        'Transfer HBAR to multiple accounts in a single batch operation. ' +
        'CSV format: to,amount,memo (memo is optional)',
      options: [
        {
          name: 'file',
          short: 'f',
          type: 'string',
          required: true,
          description:
            'Path to CSV file containing transfers (columns: to, amount, memo)',
        },
        {
          name: 'from',
          short: 'F',
          type: 'string',
          required: false,
          description:
            'Source account: either a stored alias or account-id:private-key pair (defaults to operator)',
        },
        {
          name: 'dry-run',
          short: 'd',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Validate CSV without executing transfers',
        },
        {
          name: 'continue-on-error',
          short: 'c',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Continue processing if a transfer fails',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: batchHbarTransferHandler,
      output: {
        schema: BatchHbarTransferOutputSchema,
        humanTemplate: BATCH_HBAR_TRANSFER_TEMPLATE,
      },
    },
    {
      name: 'token-transfer',
      summary: 'Batch transfer tokens from a CSV file',
      description:
        'Transfer fungible tokens to multiple accounts in a single batch operation. ' +
        'CSV format: to,amount,memo (memo is optional)',
      options: [
        {
          name: 'file',
          short: 'f',
          type: 'string',
          required: true,
          description:
            'Path to CSV file containing transfers (columns: to, amount, memo)',
        },
        {
          name: 'token',
          short: 'T',
          type: 'string',
          required: true,
          description: 'Token ID or alias to transfer',
        },
        {
          name: 'from',
          short: 'F',
          type: 'string',
          required: false,
          description:
            'Source account: either a stored alias or account-id:private-key pair (defaults to operator)',
        },
        {
          name: 'dry-run',
          short: 'd',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Validate CSV without executing transfers',
        },
        {
          name: 'continue-on-error',
          short: 'c',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Continue processing if a transfer fails',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: batchTokenTransferHandler,
      output: {
        schema: BatchTokenTransferOutputSchema,
        humanTemplate: BATCH_TOKEN_TRANSFER_TEMPLATE,
      },
    },
    {
      name: 'summary',
      summary: 'List recent batch operations',
      description: 'Show a summary of recent batch operations stored in state',
      options: [
        {
          name: 'limit',
          short: 'l',
          type: 'number',
          required: false,
          default: 10,
          description: 'Number of recent batch operations to show',
        },
      ],
      handler: batchSummaryHandler,
      output: {
        schema: BatchSummaryOutputSchema,
        humanTemplate: BATCH_SUMMARY_TEMPLATE,
      },
    },
  ],
};

export default batchPluginManifest;
