/**
 * Credentials Management Plugin Manifest
 * A plugin for managing operator credentials
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import { OptionType } from '@/core/types/shared.types';

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

export const CREDENTIALS_NAMESPACE = 'credentials';

export const credentialsManifest: PluginManifest = {
  name: 'credentials',
  version: '1.0.0',
  displayName: 'Credentials Management',
  description: 'Manage operator credentials and keys',
  commands: [
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
      description: 'Remove credentials by keyRefId from KMS storage',
      options: [
        {
          name: 'id',
          short: 'i',
          type: OptionType.STRING,
          required: true,
          description: 'Key reference ID to remove from KMS',
        },
      ],
      handler: credentialsRemove,
      output: {
        schema: CredentialsRemoveOutputSchema,
        humanTemplate: CREDENTIALS_REMOVE_TEMPLATE,
      },
      requireConfirmation:
        "Are you sure you want to remove credentials with ID '{{id}}'? This action cannot be undone.",
    },
  ],
};

export default credentialsManifest;
