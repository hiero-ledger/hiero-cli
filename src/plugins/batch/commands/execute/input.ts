import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas';

/**
 * Input schema for batch execute command
 */
export const BatchExecuteInputSchema = z.object({
  name: AliasNameSchema.describe('Batch name'),
});

export type BatchExecuteInput = z.infer<typeof BatchExecuteInputSchema>;
