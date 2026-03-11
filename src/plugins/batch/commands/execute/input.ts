import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas';

/**
 * Input schema for batch execute command
 */
export const ExecuteBatchInputSchema = z.object({
  name: AliasNameSchema.describe('Batch name'),
});

export type ExecuteBatchInput = z.infer<typeof ExecuteBatchInputSchema>;
