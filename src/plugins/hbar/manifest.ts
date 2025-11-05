/**
 * HBAR Plugin Manifest
 * Defines the hbar plugin and its commands
 */
import { PluginManifest } from '../../core/plugins/plugin.interface';
import { TransferOutputSchema, TRANSFER_TEMPLATE } from './commands/transfer';
import { transferHandler } from './commands/transfer/handler';

export const hbarPluginManifest: PluginManifest = {
  name: 'hbar',
  version: '1.0.0',
  displayName: 'HBAR Plugin',
  description: 'HBAR related commands (transfer etc.)',
  compatibility: {
    cli: '^1.0.0',
    core: '^1.0.0',
    api: '^1.0.0',
  },
  capabilities: ['tx-execution:use', 'network:read'],
  commands: [
    {
      name: 'transfer',
      summary: 'Transfer tinybars between accounts',
      description: 'Transfer HBAR (tinybars) from one account to another',
      options: [
        {
          name: 'balance',
          short: 'b',
          type: 'string',
          required: true,
          description:
            'Amount in HBAR (display units by default, add "t" for tinybar). Default: display units. Example: "1" = 1 HBAR, "100t" = 100 tinybar',
        },
        {
          name: 'to',
          short: 't',
          type: 'string',
          required: true,
          description: 'Account ID or name to transfer to',
        },
        {
          name: 'from',
          short: 'f',
          type: 'string',
          required: false,
          description:
            'AccountID:privateKey pair or account name to transfer from (defaults to operator)',
        },
        {
          name: 'memo',
          short: 'm',
          type: 'string',
          required: false,
          description: 'Memo for the transfer',
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
