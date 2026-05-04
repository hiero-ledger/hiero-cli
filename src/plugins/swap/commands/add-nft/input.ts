import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
  NftSerialNumbersSchema,
} from '@/core/schemas';

export const SwapAddNftInputSchema = z.object({
  name: z.string().min(1).describe('Name of the swap to add this transfer to'),
  from: KeySchema.optional().describe(
    'Source account. Accepts accountId:privateKey, alias, or accountId. Defaults to operator.',
  ),
  to: z.string().min(1).describe('Destination account (accountId or alias)'),
  token: EntityReferenceSchema.describe('NFT token identifier (ID or alias)'),
  serials: NftSerialNumbersSchema,
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type SwapAddNftInput = z.infer<typeof SwapAddNftInputSchema>;
