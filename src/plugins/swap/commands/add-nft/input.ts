import { z } from 'zod';

import {
  AliasNameSchema,
  KeyManagerTypeSchema,
  KeySchema,
  NftSerialNumbersSchema,
  TokenReferenceObjectSchema,
} from '@/core/schemas';

export const SwapAddNftInputSchema = z.object({
  name: AliasNameSchema.describe('Name of the swap to add this transfer to'),
  from: KeySchema.optional().describe(
    'Source account. Accepts accountId:privateKey, alias, or accountId. Defaults to operator.',
  ),
  to: KeySchema.describe('Destination account. Accepts any key format.'),
  token: TokenReferenceObjectSchema,
  serials: NftSerialNumbersSchema,
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type SwapAddNftInput = z.infer<typeof SwapAddNftInputSchema>;
