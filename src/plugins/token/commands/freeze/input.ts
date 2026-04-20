import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas/common-schemas';

export const TokenFreezeInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token ID or alias'),
  account: AccountReferenceObjectSchema.describe(
    'Account to freeze (ID, alias, or EVM address)',
  ),
  freezeKey: KeySchema.describe('Token freeze key'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenFreezeInput = z.infer<typeof TokenFreezeInputSchema>;
