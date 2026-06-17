/**
 * List Credentials Command Output Schema and Template
 */
import { z } from 'zod';

import { PublicKeyDefinitionSchema } from '@/core/schemas';
import { keyManagerNameSchema } from '@/core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '@/core/shared/constants';

/**
 * Credential entry schema
 */
const CredentialEntrySchema = z.object({
  keyRefId: z.string().describe('Key reference ID'),
  keyManager: keyManagerNameSchema,
  publicKey: PublicKeyDefinitionSchema,
  keyAlgorithm: z.enum(KeyAlgorithm).describe('Cryptographic key algorithm'),
  alias: z
    .string()
    .describe('Linked key alias on the current network')
    .optional(),
  labels: z.array(z.string()).describe('Associated labels').optional(),
});

/**
 * List Credentials Command Output Schema
 */
export const CredentialsListOutputSchema = z.object({
  credentials: z.array(CredentialEntrySchema),
  totalCount: z.number().describe('Total number of stored credentials'),
});

export type CredentialsListOutput = z.infer<typeof CredentialsListOutputSchema>;

/**
 * Human-readable template for list credentials output
 */
export const CREDENTIALS_LIST_TEMPLATE = `
{{#if (eq totalCount 0)}}
🔐 No credentials stored
{{else}}
🔐 Found {{totalCount}} stored credential(s):

{{#each credentials}}
{{add1 @index}}. Key Reference ID: {{keyRefId}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
   Key Manager: {{keyManager}}
   Key Algorithm: {{keyAlgorithm}}
   Public Key: {{publicKey}}
{{#if labels}}
   Labels: {{#each labels}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{/each}}
{{/if}}
`.trim();
