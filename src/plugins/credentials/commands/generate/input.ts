import { z } from 'zod';

import {
  AliasNameSchema,
  KeyManagerTypeSchema,
  KeyTypeSchema,
} from '@/core/schemas/common-schemas';

/**
 * Input schema for the `credentials generate` command.
 */
export const CredentialsGenerateInputSchema = z.object({
  alias: AliasNameSchema.optional().describe('Optional key alias'),
  keyType: KeyTypeSchema.optional().describe(
    'Cryptographic key type for the account',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type CredentialsGenerateInput = z.infer<
  typeof CredentialsGenerateInputSchema
>;
