import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';
import { AccountCreateBatchStateHook } from '@/plugins/account/hooks/batch-create';
import { AccountDeleteBatchStateHook } from '@/plugins/account/hooks/batch-delete';
import { AccountUpdateBatchStateHook } from '@/plugins/account/hooks/batch-update';

import {
  ACCOUNT_BALANCE_TEMPLATE,
  accountBalance,
  AccountBalanceOutputSchema,
} from './commands/balance';
import {
  ACCOUNT_CLEAR_TEMPLATE,
  accountClear,
  AccountClearOutputSchema,
} from './commands/clear';
import {
  ACCOUNT_CREATE_TEMPLATE,
  accountCreate,
  AccountCreateOutputSchema,
} from './commands/create';
import {
  ACCOUNT_DELETE_TEMPLATE,
  accountDelete,
  AccountDeleteOutputSchema,
} from './commands/delete';
import {
  ACCOUNT_IMPORT_TEMPLATE,
  accountImport,
  AccountImportOutputSchema,
} from './commands/import';
import {
  ACCOUNT_LIST_TEMPLATE,
  accountList,
  AccountListOutputSchema,
} from './commands/list';
import {
  ACCOUNT_UPDATE_TEMPLATE,
  accountUpdate,
  AccountUpdateOutputSchema,
} from './commands/update';
import {
  ACCOUNT_VIEW_TEMPLATE,
  accountView,
  AccountViewOutputSchema,
} from './commands/view';

export const ACCOUNT_NAMESPACE = 'account-accounts';

export const accountPluginManifest: PluginManifest = {
  name: 'account',
  version: '1.0.0',
  displayName: 'Account Plugin',
  description: 'Plugin for managing Hedera accounts',
  hooks: [
    {
      name: 'account-create-batch-state',
      hook: new AccountCreateBatchStateHook(),
      options: [],
    },
    {
      name: 'account-update-batch-state',
      hook: new AccountUpdateBatchStateHook(),
      options: [],
    },
    {
      name: 'account-delete-batch-state',
      hook: new AccountDeleteBatchStateHook(),
      options: [],
    },
  ],
  commands: [
    {
      name: 'create',
      summary: 'Create a new Hedera account',
      description:
        'Create a new Hedera account with specified balance and settings',
      registeredHooks: ['batchify', 'scheduled'],
      options: [
        {
          name: 'balance',
          short: 'b',
          type: OptionType.STRING,
          required: true,
          description:
            'Initial HBAR balance. Default: display units. Add "t" for base units.',
        },
        {
          name: 'auto-associations',
          short: 'a',
          type: OptionType.NUMBER,
          required: false,
          default: 0,
          description:
            'The maximum number of automatic association tokens allowed. Default value set to 0',
        },
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: false,
          description: 'Alias of the created account to be used',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
        {
          name: 'key-type',
          short: 't',
          type: OptionType.STRING,
          required: false,
          description:
            'Key type for the account. Options: ecdsa, ed25519. Default: ecdsa. Mutually exclusive with --key.',
        },
        {
          name: 'key',
          short: 'K',
          type: OptionType.STRING,
          required: false,
          description:
            'Existing key for the new account (ecdsa/ed25519 private or public key, key reference kr_xxx, or alias name). Mutually exclusive with --key-type.',
        },
      ],
      handler: accountCreate,
      output: {
        schema: AccountCreateOutputSchema,
        humanTemplate: ACCOUNT_CREATE_TEMPLATE,
      },
    },
    {
      name: 'update',
      summary: 'Update an existing Hedera account',
      description: 'Update properties of an existing Hedera account on-chain',
      registeredHooks: ['batchify'],
      options: [
        {
          name: 'account',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description: 'Account ID or alias of the account to update',
        },
        {
          name: 'key',
          short: 'K',
          type: OptionType.STRING,
          required: false,
          description:
            'New key for the account (private/public key, key reference, or alias). Requires private key in KMS.',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
        {
          name: 'memo',
          short: 'm',
          type: OptionType.STRING,
          required: false,
          description:
            'Account memo (max 100 characters). Pass "null" to clear.',
        },
        {
          name: 'max-auto-associations',
          type: OptionType.NUMBER,
          required: false,
          description:
            'Max automatic token associations (-1 for unlimited, 0 to disable)',
        },
        {
          name: 'staked-account-id',
          type: OptionType.STRING,
          required: false,
          description: 'Account ID to stake to. Pass "null" to clear.',
        },
        {
          name: 'staked-node-id',
          type: OptionType.NUMBER,
          required: false,
          description: 'Node ID to stake to. Pass "null" to clear.',
        },
        {
          name: 'decline-staking-reward',
          type: OptionType.BOOLEAN,
          required: false,
          description: 'Decline staking reward',
        },
        {
          name: 'auto-renew-period',
          type: OptionType.NUMBER,
          required: false,
          description: 'Auto renew period in seconds',
        },
        {
          name: 'receiver-signature-required',
          type: OptionType.BOOLEAN,
          required: false,
          description: 'Require receiver signature for transfers',
        },
      ],
      handler: accountUpdate,
      output: {
        schema: AccountUpdateOutputSchema,
        humanTemplate: ACCOUNT_UPDATE_TEMPLATE,
      },
    },
    {
      name: 'balance',
      summary: 'Get account balance',
      description: 'Retrieve the balance for an account ID or name',
      options: [
        {
          name: 'account',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description: 'Account ID or alias of the account present in state',
        },
        {
          name: 'hbar-only',
          short: 'H',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description: 'Show only HBAR balance',
        },
        {
          name: 'token',
          short: 't',
          type: OptionType.STRING,
          required: false,
          description: 'Token ID or token name',
        },
        {
          name: 'raw',
          short: 'r',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description:
            'Display balances in raw units (tinybars for HBAR, base units for tokens)',
        },
      ],
      handler: accountBalance,
      output: {
        schema: AccountBalanceOutputSchema,
        humanTemplate: ACCOUNT_BALANCE_TEMPLATE,
      },
    },
    {
      name: 'list',
      summary: 'List all accounts',
      description: 'List all accounts stored in the address book',
      options: [
        {
          name: 'private',
          short: 'p',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description: 'Include private keys reference ID in listing',
        },
      ],
      handler: accountList,
      output: {
        schema: AccountListOutputSchema,
        humanTemplate: ACCOUNT_LIST_TEMPLATE,
      },
    },
    {
      name: 'import',
      summary: 'Import an existing account',
      description:
        'Import an existing account into the CLI tool. Provide accountId:privateKey format (e.g., "0.0.123456:abc123...").',
      options: [
        {
          name: 'key',
          short: 'K',
          type: OptionType.STRING,
          required: true,
          description:
            'Private key in accountId:privateKey format (e.g., "0.0.123456:abc123...")',
        },
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: false,
          description: 'Name of the account to be used',
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
      handler: accountImport,
      output: {
        schema: AccountImportOutputSchema,
        humanTemplate: ACCOUNT_IMPORT_TEMPLATE,
      },
    },
    {
      name: 'clear',
      summary: 'Clear all accounts',
      description: 'Remove all account information from the address book',
      options: [],
      handler: accountClear,
      output: {
        schema: AccountClearOutputSchema,
        humanTemplate: ACCOUNT_CLEAR_TEMPLATE,
      },
      requireConfirmation:
        'Are you sure you want to remove ALL accounts from the address book? This action cannot be undone.',
    },
    {
      name: 'delete',
      summary: 'Delete an account',
      description:
        'Delete an account on Hedera and remove it from local state (default). Requires --transfer-id for the beneficiary account. Use --state-only to remove only from local state without a network transaction.',
      registeredHooks: ['batchify'],
      options: [
        {
          name: 'account',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description: 'Account ID or alias of the account present in state',
        },
        {
          name: 'transfer-id',
          short: 't',
          type: OptionType.STRING,
          required: false,
          description:
            'Required when deleting on Hedera: account that receives remaining HBAR (Hedera ID or alias). Mutually exclusive with --state-only',
        },
        {
          name: 'state-only',
          short: 's',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description:
            'Remove the account only from local CLI state; do not submit AccountDeleteTransaction. Mutually exclusive with --transfer-id',
        },
      ],
      handler: accountDelete,
      output: {
        schema: AccountDeleteOutputSchema,
        humanTemplate: ACCOUNT_DELETE_TEMPLATE,
      },
      requireConfirmation:
        'Are you sure you want to delete account {{account}}? This cannot be undone.',
    },
    {
      name: 'view',
      summary: 'View account details',
      description: 'View detailed information about an account',
      options: [
        {
          name: 'account',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description: 'Account ID or alias of the account present in state',
        },
      ],
      handler: accountView,
      output: {
        schema: AccountViewOutputSchema,
        humanTemplate: ACCOUNT_VIEW_TEMPLATE,
      },
    },
  ],
};

export default accountPluginManifest;
