import type { PluginManifest } from '@/core/plugins/plugin.interface';

import { OptionType } from '@/core/types/shared.types';

import {
  SWAP_ADD_FT_TEMPLATE,
  swapAddFt,
  SwapAddFtOutputSchema,
} from './commands/add-ft';
import {
  SWAP_ADD_HBAR_TEMPLATE,
  swapAddHbar,
  SwapAddHbarOutputSchema,
} from './commands/add-hbar';
import {
  SWAP_ADD_NFT_TEMPLATE,
  swapAddNft,
  SwapAddNftOutputSchema,
} from './commands/add-nft';
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
import {
  SWAP_VIEW_TEMPLATE,
  swapView,
  SwapViewOutputSchema,
} from './commands/view';

export const swapPluginManifest: PluginManifest = {
  name: 'swap',
  version: '1.0.0',
  displayName: 'Swap Plugin',
  description:
    'Build and execute multi-party token/HBAR swaps in a single transaction',
  commands: [
    {
      name: 'create',
      summary: 'Create a new swap',
      description: 'Create a new named swap to which transfers can be added',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name for the swap',
        },
        {
          name: 'memo',
          short: 'm',
          type: OptionType.STRING,
          required: false,
          description: 'Optional memo attached to the transaction',
        },
      ],
      handler: swapCreate,
      output: {
        schema: SwapCreateOutputSchema,
        humanTemplate: SWAP_CREATE_TEMPLATE,
      },
    },
    {
      name: 'add-hbar',
      summary: 'Add an HBAR transfer to a swap',
      description: 'Add an HBAR transfer step to an existing swap',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the swap to add this transfer to',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description: 'Destination account (accountId or alias)',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Amount to transfer. "10" = 10 HBAR, "1000t" = 1000 tinybars.',
        },
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Source account. Accepts accountId:privateKey, alias, or accountId. Defaults to operator.',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config setting)',
        },
      ],
      handler: swapAddHbar,
      output: {
        schema: SwapAddHbarOutputSchema,
        humanTemplate: SWAP_ADD_HBAR_TEMPLATE,
      },
    },
    {
      name: 'add-ft',
      summary: 'Add a fungible token transfer to a swap',
      description: 'Add a fungible token transfer step to an existing swap',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the swap to add this transfer to',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description: 'Destination account (accountId or alias)',
        },
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'Fungible token identifier (token ID or alias)',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Amount to transfer in display units. Add "t" for base units. Example: "10" = 10 tokens.',
        },
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Source account. Accepts accountId:privateKey, alias, or accountId. Defaults to operator.',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config setting)',
        },
      ],
      handler: swapAddFt,
      output: {
        schema: SwapAddFtOutputSchema,
        humanTemplate: SWAP_ADD_FT_TEMPLATE,
      },
    },
    {
      name: 'add-nft',
      summary: 'Add an NFT transfer to a swap',
      description: 'Add one or more NFT serial transfers to an existing swap',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the swap to add this transfer to',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description: 'Destination account (accountId or alias)',
        },
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'NFT token identifier (token ID or alias)',
        },
        {
          name: 'serials',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description:
            'Comma-separated list of serial numbers to transfer. Example: "1,2,3".',
        },
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Source account. Accepts accountId:privateKey, alias, or accountId. Defaults to operator.',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config setting)',
        },
      ],
      handler: swapAddNft,
      output: {
        schema: SwapAddNftOutputSchema,
        humanTemplate: SWAP_ADD_NFT_TEMPLATE,
      },
    },
    {
      name: 'execute',
      summary: 'Execute a swap',
      description:
        'Sign and submit a swap transaction. The swap is removed from state on success.',
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
      name: 'list',
      summary: 'List all saved swaps',
      description: 'Display a summary of all saved swaps',
      options: [],
      handler: swapList,
      output: {
        schema: SwapListOutputSchema,
        humanTemplate: SWAP_LIST_TEMPLATE,
      },
    },
    {
      name: 'view',
      summary: 'View a saved swap',
      description: 'Display the full details and transfers of a saved swap',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the swap to view',
        },
      ],
      handler: swapView,
      output: {
        schema: SwapViewOutputSchema,
        humanTemplate: SWAP_VIEW_TEMPLATE,
      },
    },
    {
      name: 'delete',
      summary: 'Delete a saved swap',
      description: 'Remove a swap from state without executing it',
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
  ],
};

export default swapPluginManifest;
