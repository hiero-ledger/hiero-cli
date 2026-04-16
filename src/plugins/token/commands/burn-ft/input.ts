import { z } from 'zod';

import {
  AmountInputSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const TokenBurnFtInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  amount: AmountInputSchema.describe(
    'Amount to burn (display units or base units with "t" suffix)',
  ),
  supplyKey: KeySchema.describe('Supply key. Accepts any key format.'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenBurnFtInput = z.infer<typeof TokenBurnFtInputSchema>;
