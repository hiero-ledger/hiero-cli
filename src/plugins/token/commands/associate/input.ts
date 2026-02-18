import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  PrivateKeyWithAccountIdSchema,
} from '@/core/schemas';

/**
 * Input schema for token associate command
 * Validates arguments for associating a token with an account
 */
export const AssociateTokenInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  account: PrivateKeyWithAccountIdSchema.describe(
    'Account to associate. Can be accountId:privateKey pair, key reference or account name.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type AssociateTokenInput = z.infer<typeof AssociateTokenInputSchema>;
