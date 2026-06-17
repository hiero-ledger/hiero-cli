/**
 * The `credentials import` command reuses the shared key-credential output.
 */
import { z } from 'zod';

import { PublicKeyDefinitionSchema, SupportedNetwork } from '@/core';
import { keyManagerNameSchema } from '@/core/services/kms/kms-types.interface';

export const CredentialsImportOutputSchema = z.object({
  keyRefId: z.string().describe('Key reference ID'),
  publicKey: PublicKeyDefinitionSchema,
  keyManager: keyManagerNameSchema,
  alias: z.string().describe('Linked key alias').optional(),
  network: z
    .enum(SupportedNetwork)
    .describe('Network the alias is scoped to')
    .optional(),
});

export type CredentialsImportOutput = z.infer<
  typeof CredentialsImportOutputSchema
>;

export const CREDENTIALS_IMPORT_TEMPLATE = `
🔑 Key credential imported:
   Key Reference ID: {{keyRefId}}
{{#if alias}}
   Alias: {{alias}} ({{network}})
{{/if}}
   Key Manager: {{keyManager}}
   Public Key: {{publicKey}}
`.trim();
