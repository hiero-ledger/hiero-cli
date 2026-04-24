import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  OptionalDefaultEmptyKeyListSchema,
} from '@/core/schemas/common-schemas';

export const TokenUnfreezeInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token ID or alias'),
  account: AccountReferenceObjectSchema.describe(
    'Account to unfreeze (ID, alias, or EVM address)',
  ),
  freezeKey: OptionalDefaultEmptyKeyListSchema.describe(
    "Token freeze key credential(s). If omitted, resolved from key manager by matching the token's on-chain key.",
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenUnfreezeInput = z.infer<typeof TokenUnfreezeInputSchema>;
