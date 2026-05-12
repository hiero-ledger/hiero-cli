import { z } from 'zod';

import { AliasNameSchema, MemoSchema } from '@/core/schemas';

export const SwapCreateInputSchema = z.object({
  name: AliasNameSchema.describe('Name for the swap'),
  memo: MemoSchema.optional().describe(
    'Optional memo attached to the transaction',
  ),
});

export type SwapCreateInput = z.infer<typeof SwapCreateInputSchema>;
