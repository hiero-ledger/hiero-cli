/**
 * Batch Transfer FT Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

const BatchTransferFtRowResultSchema = z.object({
  row: z.number(),
  status: z.enum(['success', 'failed']),
  to: z.string().optional(),
  amount: z.string().optional(),
  transactionId: z.string().optional(),
  errorMessage: z.string().optional(),
});

export const BatchTransferFtOutputSchema = z.object({
  total: z.number(),
  succeeded: z.number(),
  failed: z.number(),
  tokenId: EntityIdSchema,
  fromAccount: z.string(),
  network: NetworkSchema,
  dryRun: z.boolean(),
  results: z.array(BatchTransferFtRowResultSchema),
});

export type BatchTransferFtOutput = z.infer<typeof BatchTransferFtOutputSchema>;

export const BATCH_TRANSFER_FT_TEMPLATE = `
{{#if dryRun}}
🔍 Dry run complete — no transactions were submitted.
{{else}}
✅ Batch fungible token transfer complete!
{{/if}}

Token: {{hashscanLink tokenId "token" network}}
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
