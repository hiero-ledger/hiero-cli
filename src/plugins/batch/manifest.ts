/**
 * Batch Plugin Manifest
 * Defines the batch plugin according to ADR-001
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';

import {
  CREATE_BATCH_TEMPLATE,
  CreateBatchCommand,
  CreateBatchOutputSchema,
} from './commands/create';
import {
  EXECUTE_BATCH_TEMPLATE,
  ExecuteBatchCommand,
  ExecuteBatchOutputSchema,
} from './commands/execute';

export const BATCH_NAMESPACE = 'batch-batches';

export const batchPluginManifest: PluginManifest = {
  name: 'batch',
  version: '1.0.0',
  displayName: 'Batch Plugin',
  description:
    'Plugin for creating and executing batches of Hedera transactions',
  commands: [
    {
      name: 'create',
      summary: 'Create a new batch',
      description:
        'Create a new batch with a name and signing key for transaction execution',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name/alias for the batch',
        },
        {
          name: 'key',
          short: 'k',
          type: OptionType.STRING,
          required: true,
          description:
            'Key to sign transactions. Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias',
        },
        {
          name: 'key-manager',
          short: 'm',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      command: new CreateBatchCommand(),
      output: {
        schema: CreateBatchOutputSchema,
        humanTemplate: CREATE_BATCH_TEMPLATE,
      },
    },
    {
      name: 'execute',
      summary: 'Execute a batch',
      description:
        'Execute a batch by name, signing and submitting its transactions',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the batch to execute',
        },
      ],
      command: new ExecuteBatchCommand(),
      output: {
        schema: ExecuteBatchOutputSchema,
        humanTemplate: EXECUTE_BATCH_TEMPLATE,
      },
    },
  ],
};

export default batchPluginManifest;
