/**
 * Credentials Management Plugin Manifest
 * A plugin for managing operator credentials
 * Updated for ADR-003 compliance
 */
import { PluginManifest } from '../../core/plugins/plugin.interface';
import {
  ListCredentialsOutputSchema,
  LIST_CREDENTIALS_TEMPLATE,
} from './commands/list/output';
import {
  RemoveCredentialsOutputSchema,
  REMOVE_CREDENTIALS_TEMPLATE,
} from './commands/remove/output';
import { CREDENTIALS_JSON_SCHEMA, CREDENTIALS_NAMESPACE } from './schema';
import { listCredentials } from './commands/list/handler';
import { removeCredentials } from './commands/remove/handler';

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
  stateSchemas: [
    {
      namespace: CREDENTIALS_NAMESPACE,
      version: 1,
      jsonSchema: CREDENTIALS_JSON_SCHEMA,
      scope: 'profile',
    },
  ],
  commands: [
    {
      name: 'list',
      summary: 'List all credentials',
      description: 'Show all stored credentials',
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
        { name: 'key-ref-id', short: 'k', type: 'string', required: true },
      ],
      handler: removeCredentials,
      output: {
        schema: RemoveCredentialsOutputSchema,
        humanTemplate: REMOVE_CREDENTIALS_TEMPLATE,
      },
    },
  ],
};

export default credentialsManifest;
