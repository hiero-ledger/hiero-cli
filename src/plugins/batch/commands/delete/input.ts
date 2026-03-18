import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas';

/**
 * Input schema for batch delete command
 * Delete whole batch by name, or a single transaction by name and order
 */
export const BatchDeleteInputSchema = z.object({
  name: AliasNameSchema.describe('Batch name'),
  order: z
    .int()
    .min(0)
    .optional()
    .describe(
      'Order of transaction to remove. If omitted, deletes the entire batch',
    ),
});

export type BatchDeleteInput = z.infer<typeof BatchDeleteInputSchema>;
