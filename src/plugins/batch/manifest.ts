/**
 * Batch Plugin Manifest
 * Defines the batch plugin according to ADR-001
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';
import {
  BATCH_LIST_TEMPLATE,
  batchList,
  BatchListOutputSchema,
} from '@/plugins/batch/commands/list';
import { BatchifyAddTransactionHook } from '@/plugins/batch/hooks/batchify-add-transaction';
import { BatchifySetBatchKeyHook } from '@/plugins/batch/hooks/batchify-set-batch-key';

import {
  BATCH_CREATE_TEMPLATE,
  batchCreate,
  BatchCreateOutputSchema,
} from './commands/create';
import {
  BATCH_DELETE_TEMPLATE,
  batchDelete,
  BatchDeleteOutputSchema,
} from './commands/delete';
import {
  BATCH_EXECUTE_TEMPLATE,
  batchExecute,
  BatchExecuteOutputSchema,
} from './commands/execute';

export const batchPluginManifest: PluginManifest = {
  name: 'batch',
  version: '1.0.0',
  displayName: 'Batch Plugin',
  description:
    'Plugin for creating and executing batches of Hedera transactions',
  hooks: [
    {
      name: 'batchify-set-batch-key',
      hook: new BatchifySetBatchKeyHook(),
      options: [
        {
          name: 'batch',
          short: 'B',
          type: OptionType.STRING,
          description: 'Name of the batch',
        },
      ],
    },
    {
      name: 'batchify-add-transaction',
      hook: new BatchifyAddTransactionHook(),
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
          required: false,
          description:
            'Key to sign transactions. Defaults to operator when omitted. Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias',
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
        schema: BatchCreateOutputSchema,
        humanTemplate: BATCH_CREATE_TEMPLATE,
      },
    },
    {
      name: 'execute',
      summary: 'Execute a batch',
      description:
        'Execute a batch by name, signing and submitting its transactions',
      registeredHooks: [
        {
          hook: 'account-create-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'account-update-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'account-delete-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'topic-create-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'topic-delete-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'topic-update-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'token-create-ft-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'token-create-ft-from-file-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'token-create-nft-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'token-create-nft-from-file-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'token-associate-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'token-delete-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'token-update-state',
          phase: 'postOutputPreparation',
        },
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
        schema: BatchExecuteOutputSchema,
        humanTemplate: BATCH_EXECUTE_TEMPLATE,
      },
    },
    {
      name: 'list',
      summary: 'List batches',
      description: 'List all available batches',
      options: [],
      handler: batchList,
      output: {
        schema: BatchListOutputSchema,
        humanTemplate: BATCH_LIST_TEMPLATE,
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
        schema: BatchDeleteOutputSchema,
        humanTemplate: BATCH_DELETE_TEMPLATE,
      },
    },
  ],
};

export default batchPluginManifest;
