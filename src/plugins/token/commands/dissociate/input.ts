import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

/**
 * Input schema for token dissociate command
 */
export const TokenDissociateInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  account: KeySchema.describe('Account to dissociate. Accepts any key format.'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenDissociateInput = z.infer<typeof TokenDissociateInputSchema>;
