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
          name: 'amount',
          short: 'a',
          type: 'string',
          required: true,
          description:
            'Amount to transfer. Default: display units. Add "t" for base units. Example: "1" = 1 HBAR, "100t" = 100 tinybar',
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
            'AccountID:privateKey pair, AccountID:keyType:privateKey format, or account name to transfer from (defaults to operator). Key type can be "ecdsa" or "ed25519" (defaults to ecdsa if not specified).',
        },
        {
          name: 'memo',
          short: 'm',
          type: 'string',
          required: false,
          description: 'Memo for the transfer',
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
      handler: transferHandler,
      output: {
        schema: TransferOutputSchema,
        humanTemplate: TRANSFER_TEMPLATE,
      },
    },
  ],
};

export default hbarPluginManifest;
