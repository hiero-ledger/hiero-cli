import { z } from 'zod';

import {
  AmountInputSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const SwapAddHbarInputSchema = z.object({
  name: z.string().min(1).describe('Name of the swap to add this transfer to'),
  from: KeySchema.optional().describe(
    'Source account. Accepts accountId:privateKey, alias, or accountId. Defaults to operator.',
  ),
  to: z.string().min(1).describe('Destination account (accountId or alias)'),
  amount: AmountInputSchema.refine((val) => val !== '0' && val !== '0t', {
    message: 'Transfer amount must be greater than zero',
  }).describe('Amount to transfer. "10" = 10 HBAR, "1000t" = 1000 tinybars.'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type SwapAddHbarInput = z.infer<typeof SwapAddHbarInputSchema>;
