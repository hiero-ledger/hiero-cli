import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  OptionalDefaultEmptyKeyListSchema,
} from '@/core/schemas/common-schemas';

export const TokenUnpauseInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token ID or alias'),
  pauseKey: OptionalDefaultEmptyKeyListSchema.describe(
    "Token pause key credential(s). If omitted, resolved from key manager by matching the token's on-chain key.",
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenUnpauseInput = z.infer<typeof TokenUnpauseInputSchema>;
