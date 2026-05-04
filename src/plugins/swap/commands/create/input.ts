import { z } from 'zod';

import { MemoSchema } from '@/core/schemas';

export const SwapCreateInputSchema = z.object({
  name: z.string().min(1).describe('Name for the swap'),
  memo: MemoSchema.optional().describe(
    'Optional memo attached to the transaction',
  ),
});

export type SwapCreateInput = z.infer<typeof SwapCreateInputSchema>;
