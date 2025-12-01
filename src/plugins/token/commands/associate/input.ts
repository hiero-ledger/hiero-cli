import {
  AccountOrAliasSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
} from '../../../../core/schemas';
import { z } from 'zod';

/**
 * Input schema for token associate command
 * Validates arguments for associating a token with an account
 */
export const AssociateTokenInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  account: AccountOrAliasSchema.describe(
    'Account to associate. Can be alias or AccountID:accountKey pair.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type AssociateTokenInput = z.infer<typeof AssociateTokenInputSchema>;
