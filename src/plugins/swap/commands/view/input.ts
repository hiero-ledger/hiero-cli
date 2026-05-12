import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas';

export const SwapViewInputSchema = z.object({
  name: AliasNameSchema.describe('Name of the swap to view'),
});

export type SwapViewInput = z.infer<typeof SwapViewInputSchema>;
