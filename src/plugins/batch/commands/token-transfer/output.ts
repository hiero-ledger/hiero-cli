/**
 * Batch Token Transfer Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  IsoTimestampSchema,
  NetworkSchema,
} from '@/core/schemas/common-schemas';

export const BatchTokenTransferResultSchema = z.object({
  index: z.number().int().nonnegative(),
  to: EntityIdSchema,
  amount: z.string(),
  status: z.enum(['success', 'failed', 'skipped']),
  transactionId: z.string().optional(),
  error: z.string().optional(),
});

export const BatchTokenTransferOutputSchema = z.object({
  batchId: z.string().uuid(),
  network: NetworkSchema,
  tokenId: EntityIdSchema,
  sourceFile: z.string(),
  dryRun: z.boolean(),
  totalTransfers: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  totalAmount: z.string(),
  results: z.array(BatchTokenTransferResultSchema),
  startedAt: IsoTimestampSchema,
  completedAt: IsoTimestampSchema,
});

export type BatchTokenTransferOutput = z.infer<
  typeof BatchTokenTransferOutputSchema
>;

export const BATCH_TOKEN_TRANSFER_TEMPLATE = `
{{#if dryRun}}
🔍 Dry Run - No transfers executed
{{else}}
✅ Batch Token Transfer Complete
{{/if}}

📊 Summary
   Batch ID: {{batchId}}
   Network: {{network}}
   Token ID: {{tokenId}}
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
