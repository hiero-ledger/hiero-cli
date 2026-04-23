import type { PluginManifest } from '@/core/plugins/plugin.interface';

import { OptionType } from '@/core/types/shared.types';

import {
  HBAR_ALLOWANCE_TEMPLATE,
  hbarAllowance,
  HbarAllowanceOutputSchema,
} from './commands/allowance';
import {
  HBAR_TRANSFER_TEMPLATE,
  hbarTransfer,
  HbarTransferOutputSchema,
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
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'scheduled', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
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
      handler: hbarTransfer,
      output: {
        schema: HbarTransferOutputSchema,
        humanTemplate: HBAR_TRANSFER_TEMPLATE,
      },
    },
    {
      name: 'allowance',
      summary: 'Approve HBAR allowance for a spender account',
      description:
        'Approve an account to spend HBAR on behalf of the owner up to a specified amount',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'scheduled', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Allowance amount. Default: HBAR (e.g. "10.5"). Add "t" for tinybars (e.g. "1000000t").',
        },
        {
          name: 'spender',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description:
            'Spender account. Accepts alias, accountId, or evmAddress.',
        },
        {
          name: 'owner',
          short: 'o',
          type: OptionType.STRING,
          required: false,
          description: 'Owner account. Defaults to operator.',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config setting).',
        },
      ],
      handler: hbarAllowance,
      output: {
        schema: HbarAllowanceOutputSchema,
        humanTemplate: HBAR_ALLOWANCE_TEMPLATE,
      },
    },
  ],
};

export default hbarPluginManifest;
