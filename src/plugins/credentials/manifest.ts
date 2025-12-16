/**
 * Credentials Management Plugin Manifest
 * A plugin for managing operator credentials
 * Updated for ADR-003 compliance
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import {
  LIST_CREDENTIALS_TEMPLATE,
  listCredentials,
  ListCredentialsOutputSchema,
} from './commands/list';
import {
  REMOVE_CREDENTIALS_TEMPLATE,
  removeCredentials,
  RemoveCredentialsOutputSchema,
} from './commands/remove';
import { CREDENTIALS_JSON_SCHEMA, CREDENTIALS_NAMESPACE } from './schema';

export const credentialsManifest: PluginManifest = {
  name: 'credentials',
  version: '1.0.0',
  displayName: 'Credentials Management',
  description: 'Manage operator credentials and keys',
  compatibility: {
    cli: '>=1.0.0',
    core: '>=1.0.0',
    api: '>=1.0.0',
  },
  capabilities: ['credentials:manage', 'credentials:list'],
  commands: [
    {
      name: 'list',
      summary: 'List all credentials',
      description: 'Show all stored credentials',
      options: [],
      handler: listCredentials,
      output: {
        schema: ListCredentialsOutputSchema,
        humanTemplate: LIST_CREDENTIALS_TEMPLATE,
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
          type: 'string',
          required: true,
          description: 'Key reference ID to remove from KMS',
        },
      ],
      handler: removeCredentials,
      output: {
        schema: RemoveCredentialsOutputSchema,
        humanTemplate: REMOVE_CREDENTIALS_TEMPLATE,
      },
    },
  ],
  stateSchemas: [
    {
      namespace: CREDENTIALS_NAMESPACE,
      version: 1,
      jsonSchema: CREDENTIALS_JSON_SCHEMA,
      scope: 'profile',
    },
  ],
};

export default credentialsManifest;
