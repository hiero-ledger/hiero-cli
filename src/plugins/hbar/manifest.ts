/**
 * HBAR Plugin Manifest
 * Defines the hbar plugin and its commands
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import { OptionType } from '@/core/types/shared.types';

import {
  TRANSFER_TEMPLATE,
  transferHandler,
  TransferOutputSchema,
} from './commands/transfer';

export const hbarPluginManifest: PluginManifest = {
  name: 'hbar',
  version: '1.0.0',
  displayName: 'HBAR Plugin',
  description: 'HBAR related commands (transfer etc.)',
  commands: [
    {
      name: 'transfer',
      summary: 'Transfer tinybars between accounts',
      description: 'Transfer HBAR (tinybars) from one account to another',
      options: [
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Amount to transfer. Default: display units. Add "t" for base units. Example: "1" = 1 HBAR, "100t" = 100 tinybar',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description: 'Account ID or name to transfer to',
        },
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Account to transfer from. Format as accountId:privateKey pair, key reference or account name to transfer from. Defaults to operator.',
        },
        {
          name: 'memo',
          short: 'm',
          type: OptionType.STRING,
          required: false,
          description: 'Memo for the transfer',
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
      handler: transferHandler,
      output: {
        schema: TransferOutputSchema,
        humanTemplate: TRANSFER_TEMPLATE,
      },
    },
  ],
};

export default hbarPluginManifest;
