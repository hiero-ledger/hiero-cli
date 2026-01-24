/**
 * Batch Summary Output Schema and Template
 */
import { z } from 'zod';

import { BatchStatusSchema } from '@/plugins/batch/schema';

export const BatchSummaryItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['hbar-transfer', 'token-transfer']),
  status: BatchStatusSchema,
  totalOperations: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const BatchSummaryOutputSchema = z.object({
  operations: z.array(BatchSummaryItemSchema),
  totalCount: z.number().int().nonnegative(),
});

export type BatchSummaryOutput = z.infer<typeof BatchSummaryOutputSchema>;

export const BATCH_SUMMARY_TEMPLATE = `
📊 Batch Operations Summary

{{#if operations.length}}
{{#each operations}}
{{this.id}}
   Type: {{this.type}}
   Status: {{this.status}}
   Total: {{this.totalOperations}} | ✓ {{this.successCount}} | ✗ {{this.failedCount}}
   Created: {{this.createdAt}}
{{/each}}
{{else}}
No batch operations found.
{{/if}}

Total operations: {{totalCount}}
`.trim();
