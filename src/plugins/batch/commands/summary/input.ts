/**
 * Batch Summary Input Schema
 */
import { z } from 'zod';

export const BatchSummaryInputSchema = z.object({
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .default(10)
    .describe('Number of recent batch operations to show'),
});

export type BatchSummaryInput = z.infer<typeof BatchSummaryInputSchema>;
