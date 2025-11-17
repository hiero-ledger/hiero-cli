/**
 * List Credentials Command Output Schema and Template
 */
import { z } from 'zod';
import { PublicKeySchema } from '../../../../core/schemas/common-schemas';
import { CREDENTIAL_TYPE_VALUES } from '../../../../core/services/kms/kms-types.interface';

/**
 * Credential Type Schema
 * Represents the type of credential storage (localPrivateKey, mnemonic, hardware, kms)
 */
const CredentialTypeSchema = z.enum(CREDENTIAL_TYPE_VALUES);

/**
 * Credential entry schema
 */
const CredentialEntrySchema = z.object({
  keyRefId: z.string().describe('Key reference ID'),
  type: CredentialTypeSchema.describe(
    'Credential type (localPrivateKey, mnemonic, hardware, or kms)',
  ),
  publicKey: PublicKeySchema,
  labels: z.array(z.string()).describe('Associated labels').optional(),
});

/**
 * List Credentials Command Output Schema
 */
export const ListCredentialsOutputSchema = z.object({
  credentials: z.array(CredentialEntrySchema),
  totalCount: z.number().describe('Total number of stored credentials'),
});

export type ListCredentialsOutput = z.infer<typeof ListCredentialsOutputSchema>;

/**
 * Human-readable template for list credentials output
 */
export const LIST_CREDENTIALS_TEMPLATE = `
{{#if (eq totalCount 0)}}
🔐 No credentials stored
{{else}}
🔐 Found {{totalCount}} stored credential(s):

{{#each credentials}}
{{add1 @index}}. Key Reference ID: {{keyRefId}}
   Type: {{type}}
   Public Key: {{publicKey}}
{{#if labels}}
   Labels: {{#each labels}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{/each}}
{{/if}}
`.trim();
