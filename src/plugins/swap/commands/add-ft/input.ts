import { z } from 'zod';

import {
  AmountInputSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const SwapAddFtInputSchema = z.object({
  name: z.string().min(1).describe('Name of the swap to add this transfer to'),
  from: KeySchema.optional().describe(
    'Source account. Accepts accountId:privateKey, alias, or accountId. Defaults to operator.',
  ),
  to: z.string().min(1).describe('Destination account (accountId or alias)'),
  token: EntityReferenceSchema.describe('Token identifier (ID or alias)'),
  amount: AmountInputSchema.refine((val) => val !== '0' && val !== '0t', {
    message: 'Transfer amount must be greater than zero',
  }).describe(
    'Amount to transfer. "100" = 100 tokens, "100t" = 100 base units.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type SwapAddFtInput = z.infer<typeof SwapAddFtInputSchema>;
