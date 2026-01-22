/**
 * Account Plugin Manifest
 * Defines the account plugin according to ADR-001
 */
import type { PluginManifest } from '@/core';

import { KeyAlgorithm } from '@/core/shared/constants';

import {
  ACCOUNT_BALANCE_TEMPLATE,
  AccountBalanceOutputSchema,
  getAccountBalance,
} from './commands/balance';
import {
  CLEAR_ACCOUNTS_TEMPLATE,
  clearAccounts,
  ClearAccountsOutputSchema,
} from './commands/clear';
import {
  CREATE_ACCOUNT_TEMPLATE,
  createAccount,
  CreateAccountOutputSchema,
} from './commands/create';
import {
  DELETE_ACCOUNT_TEMPLATE,
  deleteAccount,
  DeleteAccountOutputSchema,
} from './commands/delete';
import {
  IMPORT_ACCOUNT_TEMPLATE,
  importAccount,
  ImportAccountOutputSchema,
} from './commands/import';
import {
  LIST_ACCOUNTS_TEMPLATE,
  listAccounts,
  ListAccountsOutputSchema,
} from './commands/list';
import {
  VIEW_ACCOUNT_TEMPLATE,
  viewAccount,
  ViewAccountOutputSchema,
} from './commands/view';

export const ACCOUNT_NAMESPACE = 'account-accounts';

export const accountPluginManifest: PluginManifest = {
  name: 'account',
  version: '1.0.0',
  displayName: 'Account Plugin',
  description: 'Plugin for managing Hedera accounts',
  compatibility: {
    cli: '^1.0.0',
    core: '^1.0.0',
    api: '^1.0.0',
  },
  commands: [
    {
      name: 'create',
      summary: 'Create a new Hedera account',
      description:
        'Create a new Hedera account with specified balance and settings',
      options: [
        {
          name: 'balance',
          short: 'b',
          type: 'string',
          required: true,
          description:
            'Initial HBAR balance. Default: display units. Add "t" for base units.',
        },
        {
          name: 'auto-associations',
          short: 'a',
          type: 'number',
          required: false,
          default: 0,
          description:
            'The maximum number of automatic association tokens allowed. Default value set to 0',
        },
        {
          name: 'name',
          short: 'n',
          type: 'string',
          required: false,
          description: 'Alias of the created account to be used',
        },
        { name: 'payer', short: 'p', type: 'string', required: false }, //TODO: I do not see see any usage of the payer option. Should we delete that?
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
        {
          name: 'key-type',
          short: 't',
          type: 'string',
          required: false,
          default: KeyAlgorithm.ECDSA,
          description:
            'Key type for the account. Options: ecdsa, ed25519. Default: ecdsa',
        },
      ],
      handler: createAccount,
      output: {
        schema: CreateAccountOutputSchema,
        humanTemplate: CREATE_ACCOUNT_TEMPLATE,
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
          type: 'string',
          required: true,
          description:
            'Account ID, alias or name of the account present in state',
        },
        {
          name: 'hbar-only',
          short: 'H',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Show only HBAR balance',
        },
        {
          name: 'token',
          short: 't',
          type: 'string',
          required: false,
          description: 'Token ID or token name',
        },
        {
          name: 'raw',
          short: 'r',
          type: 'boolean',
          required: false,
          default: false,
          description:
            'Display balances in raw units (tinybars for HBAR, base units for tokens)',
        },
      ],
      handler: getAccountBalance,
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
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include private keys reference ID in listing',
        },
        {
          name: 'repeatable',
          short: 'r',
          type: 'repeatable',
          required: false,
          default: false,
          description: 'Repeatable test',
        },
      ],
      handler: listAccounts,
      output: {
        schema: ListAccountsOutputSchema,
        humanTemplate: LIST_ACCOUNTS_TEMPLATE,
      },
      excessArguments: true,
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
          type: 'string',
          required: true,
          description:
            'Private key in accountId:privateKey format (e.g., "0.0.123456:abc123...")',
        },
        {
          name: 'name',
          short: 'n',
          type: 'string',
          required: false,
          description: 'Name of the account to be used',
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
      handler: importAccount,
      output: {
        schema: ImportAccountOutputSchema,
        humanTemplate: IMPORT_ACCOUNT_TEMPLATE,
      },
    },
    {
      name: 'clear',
      summary: 'Clear all accounts',
      description: 'Remove all account information from the address book',
      options: [],
      handler: clearAccounts,
      output: {
        schema: ClearAccountsOutputSchema,
        humanTemplate: CLEAR_ACCOUNTS_TEMPLATE,
      },
    },
    {
      name: 'delete',
      summary: 'Delete an account',
      description:
        'Delete an account from the address book. You need to specify name or id to delete the account',
      options: [
        {
          name: 'name',
          short: 'n',
          type: 'string',
          required: false,
          description: 'Account name to be deleted from the store',
        },
        {
          name: 'id',
          short: 'i',
          type: 'string',
          required: false,
          description: 'Account ID to be deleted from the store',
        },
      ],
      handler: deleteAccount,
      output: {
        schema: DeleteAccountOutputSchema,
        humanTemplate: DELETE_ACCOUNT_TEMPLATE,
      },
    },
    {
      name: 'view',
      summary: 'View account details',
      description: 'View detailed information about an account',
      options: [
        {
          name: 'account',
          short: 'a',
          type: 'string',
          required: true,
          description:
            'Account ID, alias or name of the account present in state',
        },
      ],
      handler: viewAccount,
      output: {
        schema: ViewAccountOutputSchema,
        humanTemplate: VIEW_ACCOUNT_TEMPLATE,
      },
    },
  ],
};

export default accountPluginManifest;
