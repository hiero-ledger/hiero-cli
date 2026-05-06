import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas';

export const SwapExecuteInputSchema = z.object({
  name: AliasNameSchema.describe('Name of the swap to execute'),
});

export type SwapExecuteInput = z.infer<typeof SwapExecuteInputSchema>;
