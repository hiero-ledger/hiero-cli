/**
 * Quickstart Plugin Manifest
 * Provides commands for rapid developer onboarding and test environment setup
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import {
  INIT_TEMPLATE,
  initHandler,
  InitOutputSchema,
} from './commands/init';

import {
  ACCOUNTS_TEMPLATE,
  accountsHandler,
  AccountsOutputSchema,
} from './commands/accounts';

import {
  VERIFY_TEMPLATE,
  verifyHandler,
  VerifyOutputSchema,
} from './commands/verify';

export const QUICKSTART_NAMESPACE = 'quickstart-data';

export const quickstartPluginManifest: PluginManifest = {
  name: 'quickstart',
  version: '1.0.0',
  displayName: 'Quickstart Plugin',
  description:
    'Rapid developer onboarding and test environment setup for Hedera development',
  compatibility: {
    cli: '^1.0.0',
    core: '^1.0.0',
    api: '^1.0.0',
  },
  commands: [
    {
      name: 'init',
      summary: 'Initialize CLI for testnet development',
      description:
        'Quickly set up the CLI for testnet development by switching to testnet, ' +
        'verifying operator configuration, and running a connectivity check.',
      options: [
        {
          name: 'network',
          short: 'n',
          type: 'string',
          required: false,
          default: 'testnet',
          description:
            'Network to initialize (testnet, previewnet). Default: testnet',
        },
        {
          name: 'skip-verify',
          short: 's',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Skip the connectivity verification step',
        },
      ],
      handler: initHandler,
      output: {
        schema: InitOutputSchema,
        humanTemplate: INIT_TEMPLATE,
      },
    },
    {
      name: 'accounts',
      summary: 'Create multiple test accounts',
      description:
        'Create a set of test accounts with specified balance distribution. ' +
        'Useful for setting up test environments with multiple funded accounts.',
      options: [
        {
          name: 'count',
          short: 'c',
          type: 'number',
          required: false,
          default: 3,
          description: 'Number of accounts to create (default: 3)',
        },
        {
          name: 'balance',
          short: 'b',
          type: 'string',
          required: false,
          default: '10',
          description:
            'Initial HBAR balance for each account (default: 10 HBAR)',
        },
        {
          name: 'prefix',
          short: 'p',
          type: 'string',
          required: false,
          default: 'test',
          description: 'Prefix for account names (default: test)',
        },
      ],
      handler: accountsHandler,
      output: {
        schema: AccountsOutputSchema,
        humanTemplate: ACCOUNTS_TEMPLATE,
      },
    },
    {
      name: 'verify',
      summary: 'Verify development environment',
      description:
        'Run diagnostic checks on your development environment including ' +
        'network connectivity, operator balance, and a test transfer.',
      options: [
        {
          name: 'full',
          short: 'f',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Run full verification including test transfer',
        },
      ],
      handler: verifyHandler,
      output: {
        schema: VerifyOutputSchema,
        humanTemplate: VERIFY_TEMPLATE,
      },
    },
  ],
};

export default quickstartPluginManifest;
