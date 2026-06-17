import { z } from 'zod';

import {
  AliasNameSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas/common-schemas';

/**
 * Input schema for the `credentials import` command.
 *
 * `key` is the raw private key material; the algorithm is determined by
 * `keyType` (defaulting to ECDSA in the handler). KMS validates the key format.
 */
export const CredentialsImportInputSchema = z.object({
  key: KeySchema.describe('Key to be imported. Accepts any key format.'),
  alias: AliasNameSchema.optional().describe('Optional key alias'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type CredentialsImportInput = z.infer<
  typeof CredentialsImportInputSchema
>;
