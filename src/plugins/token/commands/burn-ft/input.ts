import { z } from 'zod';

import {
  AmountInputSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  OptionalDefaultEmptyKeyListSchema,
} from '@/core/schemas';

export const TokenBurnFtInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  amount: AmountInputSchema.describe(
    'Amount to burn (display units or base units with "t" suffix)',
  ),
  supplyKey: OptionalDefaultEmptyKeyListSchema.describe(
    "Supply key credential(s). If omitted, resolved from key manager by matching the token's on-chain key.",
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenBurnFtInput = z.infer<typeof TokenBurnFtInputSchema>;
