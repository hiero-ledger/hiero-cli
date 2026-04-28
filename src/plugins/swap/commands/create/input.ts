import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas';

export const SwapCreateInputSchema = z.object({
  name: AliasNameSchema.describe('Unique name for this swap'),
});

export type SwapCreateInput = z.infer<typeof SwapCreateInputSchema>;
