/**
 * Credentials Management Plugin Manifest
 * A plugin for managing operator credentials
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import { OptionType } from '@/core/types/shared.types';

import {
  CREDENTIALS_GENERATE_TEMPLATE,
  credentialsGenerate,
  CredentialsGenerateOutputSchema,
} from './commands/generate';
import {
  CREDENTIALS_IMPORT_TEMPLATE,
  credentialsImport,
  CredentialsImportOutputSchema,
} from './commands/import';
import {
  CREDENTIALS_LIST_TEMPLATE,
  credentialsList,
  CredentialsListOutputSchema,
} from './commands/list';
import {
  CREDENTIALS_REMOVE_TEMPLATE,
  credentialsRemove,
  CredentialsRemoveOutputSchema,
} from './commands/remove';

export const credentialsManifest: PluginManifest = {
  name: 'credentials',
  version: '1.0.0',
  displayName: 'Credentials Management',
  description: 'Manage operator credentials and keys',
  skipWizardInitialization: true,
  commands: [
    {
      name: 'generate',
      summary: 'Generate a new standalone private key',
      description:
        'Generate a new private key in KMS, optionally linked to an alias',
      options: [
        {
          name: 'alias',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description: 'Human-readable alias to assign to this key',
        },
        {
          name: 'key-type',
          short: 't',
          type: OptionType.STRING,
          required: false,
          description: 'Key algorithm (ecdsa or ed25519). Defaults to ecdsa',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Where to store the key secret (local or local_encrypted)',
        },
      ],
      handler: credentialsGenerate,
      output: {
        schema: CredentialsGenerateOutputSchema,
        humanTemplate: CREDENTIALS_GENERATE_TEMPLATE,
      },
    },
    {
      name: 'import',
      summary: 'Import an existing private key',
      description:
        'Import an existing private key into KMS, optionally linked to an alias',
      options: [
        {
          name: 'key',
          short: 'K',
          type: OptionType.STRING,
          required: true,
          description:
            'Private key to import. Accepts any supported key format: {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias',
        },
        {
          name: 'alias',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description: 'Alias to assign to this key',
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
      handler: credentialsImport,
      output: {
        schema: CredentialsImportOutputSchema,
        humanTemplate: CREDENTIALS_IMPORT_TEMPLATE,
      },
    },
    {
      name: 'list',
      summary: 'List all credentials',
      description: 'Show all stored credentials',
      options: [],
      handler: credentialsList,
      output: {
        schema: CredentialsListOutputSchema,
        humanTemplate: CREDENTIALS_LIST_TEMPLATE,
      },
    },
    {
      name: 'remove',
      summary: 'Remove credentials',
      description: 'Remove credentials by keyRefId or alias from KMS storage',
      options: [
        {
          name: 'id',
          short: 'i',
          type: OptionType.STRING,
          required: false,
          description: 'Key reference ID to remove from KMS',
        },
        {
          name: 'alias',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description: 'Key alias to remove (also unregisters the alias)',
        },
      ],
      handler: credentialsRemove,
      output: {
        schema: CredentialsRemoveOutputSchema,
        humanTemplate: CREDENTIALS_REMOVE_TEMPLATE,
      },
      requireConfirmation:
        'Are you sure you want to remove this credential? This action cannot be undone.',
    },
  ],
};

export default credentialsManifest;
