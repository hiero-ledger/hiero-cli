import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  OptionalDefaultEmptyKeyListSchema,
} from '@/core/schemas/common-schemas';

export const TokenFreezeInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token ID or alias'),
  account: AccountReferenceObjectSchema.describe(
    'Account to freeze (ID, alias, or EVM address)',
  ),
  freezeKey: OptionalDefaultEmptyKeyListSchema.describe(
    "Token freeze key credential(s). If omitted, resolved from key manager by matching the token's on-chain key.",
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenFreezeInput = z.infer<typeof TokenFreezeInputSchema>;
