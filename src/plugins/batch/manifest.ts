/**
 * Batch Plugin Manifest
 * Defines the batch plugin according to ADR-001
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';
import {
  batchList,
  LIST_BATCHES_TEMPLATE,
  ListBatchesOutputSchema,
} from '@/plugins/batch/commands/list';
import { BatchBatchifyHook } from '@/plugins/batch/hooks/batchify/handler';

import {
  batchCreate,
  CREATE_BATCH_TEMPLATE,
  CreateBatchOutputSchema,
} from './commands/create';
import {
  batchDelete,
  DELETE_BATCH_TEMPLATE,
  DeleteBatchOutputSchema,
} from './commands/delete';
import {
  batchExecute,
  EXECUTE_BATCH_TEMPLATE,
  ExecuteBatchOutputSchema,
} from './commands/execute';

export const BATCH_NAMESPACE = 'batch-batches';

export const batchPluginManifest: PluginManifest = {
  name: 'batch',
  version: '1.0.0',
  displayName: 'Batch Plugin',
  description:
    'Plugin for creating and executing batches of Hedera transactions',
  hooks: [
    {
      name: 'batchify',
      hook: new BatchBatchifyHook(),
      options: [
        {
          name: 'batch',
          short: 'B',
          type: OptionType.STRING,
          description: 'Name of the batch',
        },
      ],
    },
  ],
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
      handler: batchCreate,
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
      registeredHooks: [
        'account-create-batch-state',
        'topic-create-batch-state',
        'token-create-ft-batch-state',
        'token-create-ft-from-file-batch-state',
        'token-create-nft-batch-state',
        'token-create-nft-from-file-batch-state',
      ],
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the batch to execute',
        },
      ],
      handler: batchExecute,
      output: {
        schema: ExecuteBatchOutputSchema,
        humanTemplate: EXECUTE_BATCH_TEMPLATE,
      },
    },
    {
      name: 'list',
      summary: 'List batches',
      description: 'List all available batches',
      options: [],
      handler: batchList,
      output: {
        schema: ListBatchesOutputSchema,
        humanTemplate: LIST_BATCHES_TEMPLATE,
      },
    },
    {
      name: 'delete',
      summary: 'Delete a batch or a transaction',
      description:
        'Delete a whole batch by name, or remove a single transaction by name and order',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the batch',
        },
        {
          name: 'order',
          short: 'o',
          type: OptionType.NUMBER,
          required: false,
          description:
            'Order of transaction to remove. If omitted, deletes the entire batch',
        },
      ],
      handler: batchDelete,
      output: {
        schema: DeleteBatchOutputSchema,
        humanTemplate: DELETE_BATCH_TEMPLATE,
      },
    },
  ],
};

export default batchPluginManifest;
