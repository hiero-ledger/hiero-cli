/**
 * The `credentials generate` command reuses the shared key-credential output.
 */
import { z } from 'zod';

import {
  KeyAlgorithm,
  PublicKeyDefinitionSchema,
  SupportedNetwork,
} from '@/core';
import { keyManagerNameSchema } from '@/core/services/kms/kms-types.interface';

export const CredentialsGenerateOutputSchema = z.object({
  keyRefId: z.string().describe('Key reference ID'),
  publicKey: PublicKeyDefinitionSchema,
  keyAlgorithm: z.enum(KeyAlgorithm).describe('Cryptographic key algorithm'),
  keyManager: keyManagerNameSchema,
  alias: z.string().describe('Linked key alias').optional(),
  network: z
    .enum(SupportedNetwork)
    .describe('Network the alias is scoped to')
    .optional(),
});

export type CredentialsGenerateOutput = z.infer<
  typeof CredentialsGenerateOutputSchema
>;

export const CREDENTIALS_GENERATE_TEMPLATE = `
🔑 Key credential generated:
   Key Reference ID: {{keyRefId}}
{{#if alias}}
   Alias: {{alias}} ({{network}})
{{/if}}
   Key Algorithm: {{keyAlgorithm}}
   Key Manager: {{keyManager}}
   Public Key: {{publicKey}}
`.trim();
