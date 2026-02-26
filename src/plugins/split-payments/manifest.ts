/**
 * Split Payments Plugin Manifest
 * Batch HBAR transfers from a CSV file in a single command.
 */
import type { PluginManifest } from '@/core';
import { OptionType } from '@/core/types/shared.types';

import {
  splitPaymentsTransferHandler,
  SplitPaymentsTransferOutputSchema,
  SPLIT_PAYMENTS_TRANSFER_TEMPLATE,
} from './commands/transfer';

export const splitPaymentsPluginManifest: PluginManifest = {
  name: 'split-payments',
  version: '1.0.0',
  displayName: 'Split Payments',
  description:
    'Batch HBAR transfers from a CSV file (address, amount) in a single command',
  commands: [
    {
      name: 'transfer',
      summary: 'Batch transfer HBAR from a CSV file',
      description:
        'Read a CSV file with columns (to, amount) and execute one HBAR transfer per row. Use --dry-run to validate without sending.',
      options: [
        {
          name: 'file',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description:
            'Path to CSV file. Columns: to (address or alias), amount (e.g. 10 or 100t for tinybars). Optional header: to,amount',
        },
        {
          name: 'from',
          short: 'F',
          type: OptionType.STRING,
          required: false,
          description:
            'Payer: account alias or accountId:privateKey. Defaults to operator.',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager: local or local_encrypted (defaults to config)',
        },
        {
          name: 'dry-run',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description:
            'Validate CSV and list planned transfers without sending',
        },
      ],
      handler: splitPaymentsTransferHandler,
      output: {
        schema: SplitPaymentsTransferOutputSchema,
        humanTemplate: SPLIT_PAYMENTS_TRANSFER_TEMPLATE,
      },
    },
  ],
};

export default splitPaymentsPluginManifest;
