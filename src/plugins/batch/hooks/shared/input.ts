import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas';

/**
 * Input schema for batch execute command
 */
export const BatchifyInputSchema = z.object({
  batch: AliasNameSchema.describe('Batch name').optional(),
});

export type BatchifyInput = z.infer<typeof BatchifyInputSchema>;
