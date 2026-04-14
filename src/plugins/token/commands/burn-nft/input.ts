import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
  NftSerialNumbersSchema,
} from '@/core/schemas';

export const TokenBurnNftInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  serials: NftSerialNumbersSchema.describe(
    'Comma-separated serial numbers to burn (max 10)',
  ),
  supplyKey: KeySchema.describe('Supply key. Accepts any key format.'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenBurnNftInput = z.infer<typeof TokenBurnNftInputSchema>;
