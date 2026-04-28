import type { PluginManifest } from '@/core';

import { SwapTransferType } from '@/core/services/transfer/types';
import { OptionType } from '@/core/types/shared.types';

import {
  SWAP_ADD_TEMPLATE,
  swapAdd,
  SwapAddOutputSchema,
} from './commands/add';
import {
  SWAP_CREATE_TEMPLATE,
  swapCreate,
  SwapCreateOutputSchema,
} from './commands/create';
import {
  SWAP_DELETE_TEMPLATE,
  swapDelete,
  SwapDeleteOutputSchema,
} from './commands/delete';
import {
  SWAP_EXECUTE_TEMPLATE,
  swapExecute,
  SwapExecuteOutputSchema,
} from './commands/execute';
import {
  SWAP_LIST_TEMPLATE,
  swapList,
  SwapListOutputSchema,
} from './commands/list';

export const swapPluginManifest: PluginManifest = {
  name: 'swap',
  version: '1.0.0',
  displayName: 'Swap Plugin',
  description: 'Plugin for creating and executing atomic swaps on Hedera',
  hooks: [],
  commands: [
    {
      name: 'create',
      summary: 'Create a new named swap',
      description:
        'Register a named swap in local state. Must be done before adding transfers or executing.',
      registeredHooks: [],
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Unique name for this swap',
        },
      ],
      handler: swapCreate,
      output: {
        schema: SwapCreateOutputSchema,
        humanTemplate: SWAP_CREATE_TEMPLATE,
      },
    },
    {
      name: 'add',
      summary: 'Add a transfer to an existing swap',
      description:
        'Add a transfer to a named swap. Each transfer defines who sends what to whom. A swap requires at least two transfers — one per participant — so that both sides of the exchange are settled at the same time.',
      registeredHooks: [],
      options: [
        {
          name: 'swap',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the swap to add the transfer to',
        },
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description:
            'Sender account. Accepts account ID, alias, or key reference.',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description:
            'Receiver account. Accepts account ID, alias, or key reference.',
        },
        {
          name: 'type',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: `Transfer type: ${Object.values(SwapTransferType).join(' | ')}`,
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Amount to transfer. Format: "100" (display units) or "100t" (base units)',
        },
        {
          name: 'token-id',
          short: 'i',
          type: OptionType.STRING,
          required: false,
          description: 'Token ID — required when --type ft',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: swapAdd,
      output: {
        schema: SwapAddOutputSchema,
        humanTemplate: SWAP_ADD_TEMPLATE,
      },
    },
    {
      name: 'execute',
      summary: 'Execute an atomic swap',
      description:
        'Build and submit a single TransferTransaction for all transfers in the swap. Requires at least 2 transfers. Marks the swap as executed on success.',
      registeredHooks: [],
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the swap to execute',
        },
      ],
      handler: swapExecute,
      output: {
        schema: SwapExecuteOutputSchema,
        humanTemplate: SWAP_EXECUTE_TEMPLATE,
      },
    },
    {
      name: 'delete',
      summary: 'Delete a swap',
      description:
        'Remove a swap from local state. Prompts for confirmation. Does not affect any on-chain transactions.',
      registeredHooks: [],
      requireConfirmation:
        "Are you sure you want to delete swap '{{name}}'? This cannot be undone.",
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the swap to delete',
        },
      ],
      handler: swapDelete,
      output: {
        schema: SwapDeleteOutputSchema,
        humanTemplate: SWAP_DELETE_TEMPLATE,
      },
    },
    {
      name: 'list',
      summary: 'List all swaps',
      description: 'List all swaps in local state along with their transfers.',
      registeredHooks: [],
      options: [],
      handler: swapList,
      output: {
        schema: SwapListOutputSchema,
        humanTemplate: SWAP_LIST_TEMPLATE,
      },
    },
  ],
};
