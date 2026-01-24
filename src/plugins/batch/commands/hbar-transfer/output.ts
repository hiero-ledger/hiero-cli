/**
 * Batch HBAR Transfer Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  IsoTimestampSchema,
  NetworkSchema,
} from '@/core/schemas/common-schemas';

export const BatchHbarTransferResultSchema = z.object({
  index: z.number().int().nonnegative(),
  to: EntityIdSchema,
  amount: z.string(),
  status: z.enum(['success', 'failed', 'skipped']),
  transactionId: z.string().optional(),
  error: z.string().optional(),
});

export const BatchHbarTransferOutputSchema = z.object({
  batchId: z.string().uuid(),
  network: NetworkSchema,
  sourceFile: z.string(),
  dryRun: z.boolean(),
  totalTransfers: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  totalAmount: z.string(),
  results: z.array(BatchHbarTransferResultSchema),
  startedAt: IsoTimestampSchema,
  completedAt: IsoTimestampSchema,
});

export type BatchHbarTransferOutput = z.infer<
  typeof BatchHbarTransferOutputSchema
>;

export const BATCH_HBAR_TRANSFER_TEMPLATE = `
{{#if dryRun}}
🔍 Dry Run - No transfers executed
{{else}}
✅ Batch HBAR Transfer Complete
{{/if}}

📊 Summary
   Batch ID: {{batchId}}
   Network: {{network}}
   Source File: {{sourceFile}}
   Total Transfers: {{totalTransfers}}
   ✓ Successful: {{successCount}}
   ✗ Failed: {{failedCount}}
   ⊘ Skipped: {{skippedCount}}
   Total Amount: {{totalAmount}}

📝 Results:
{{#each results}}
   {{#if (eq this.status "success")}}✓{{else}}{{#if (eq this.status "failed")}}✗{{else}}⊘{{/if}}{{/if}} [{{this.index}}] {{this.to}} - {{this.amount}}{{#if this.error}} ({{this.error}}){{/if}}
{{/each}}
`.trim();
