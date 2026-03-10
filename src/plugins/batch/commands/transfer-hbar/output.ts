/**
 * Batch Transfer HBAR Command Output Schema and Template
 */
import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas/common-schemas';

const BatchTransferHbarRowResultSchema = z.object({
  row: z.number(),
  status: z.enum(['success', 'failed']),
  to: z.string().optional(),
  amount: z.string().optional(),
  transactionId: z.string().optional(),
  errorMessage: z.string().optional(),
});

export const BatchTransferHbarOutputSchema = z.object({
  total: z.number(),
  succeeded: z.number(),
  failed: z.number(),
  fromAccount: z.string(),
  network: NetworkSchema,
  dryRun: z.boolean(),
  results: z.array(BatchTransferHbarRowResultSchema),
});

export type BatchTransferHbarOutput = z.infer<
  typeof BatchTransferHbarOutputSchema
>;

export const BATCH_TRANSFER_HBAR_TEMPLATE = `
{{#if dryRun}}
🔍 Dry run complete — no transactions were submitted.
{{else}}
✅ Batch HBAR transfer complete!
{{/if}}

From: {{fromAccount}}
Network: {{network}}
Total: {{total}} | Succeeded: {{succeeded}} | Failed: {{failed}}

{{#each results}}
  Row {{row}}: {{status}}{{#if transactionId}} — {{hashscanLink transactionId "transaction" ../network}}{{/if}}{{#if errorMessage}} — {{errorMessage}}{{/if}}
{{/each}}
{{#if failed}}

⚠️  {{failed}} transfer(s) failed. Fix the errors above and re-run with a CSV containing only the failed rows.
{{/if}}
`.trim();
