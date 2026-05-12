import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  NftSerialNumbersSchema,
  OptionalDefaultEmptyKeyListSchema,
} from '@/core/schemas';

export const TokenBurnNftInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  serials: NftSerialNumbersSchema.describe(
    'Comma-separated serial numbers to burn (max 10)',
  ),
  supplyKey: OptionalDefaultEmptyKeyListSchema.describe(
    "Supply key credential(s). If omitted, resolved from key manager by matching the token's on-chain key.",
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenBurnNftInput = z.infer<typeof TokenBurnNftInputSchema>;
