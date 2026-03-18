import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

/**
 * Input schema for token associate command
 * Validates arguments for associating a token with an account
 */
export const TokenAssociateInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  account: KeySchema.describe('Account to associate. Accepts any key format.'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenAssociateInput = z.infer<typeof TokenAssociateInputSchema>;
