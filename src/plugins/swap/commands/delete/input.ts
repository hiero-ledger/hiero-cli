import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas';

export const SwapDeleteInputSchema = z.object({
  name: AliasNameSchema.describe('Name of the swap to delete'),
});

export type SwapDeleteInput = z.infer<typeof SwapDeleteInputSchema>;
