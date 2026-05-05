import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  AmountInputSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  OptionalDefaultEmptyKeyListSchema,
} from '@/core/schemas';

export const TokenWipeFtInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  account: AccountReferenceObjectSchema.describe(
    'Account to wipe from (ID, alias, or EVM address)',
  ),
  amount: AmountInputSchema.describe(
    'Amount to wipe (display units or base units with "t" suffix)',
  ),
  wipeKey: OptionalDefaultEmptyKeyListSchema.describe(
    "Token wipe key credential(s). If omitted, resolved from key manager by matching the token's on-chain key.",
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenWipeFtInput = z.infer<typeof TokenWipeFtInputSchema>;
