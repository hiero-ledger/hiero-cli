import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas/common-schemas';

export const TokenUnfreezeInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token ID or alias'),
  account: AccountReferenceObjectSchema.describe(
    'Account to unfreeze (ID, alias, or EVM address)',
  ),
  freezeKey: KeySchema.describe('Token freeze key'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenUnfreezeInput = z.infer<typeof TokenUnfreezeInputSchema>;
