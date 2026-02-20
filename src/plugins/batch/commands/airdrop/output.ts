/**
 * Batch Airdrop Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

const BatchAirdropRowResultSchema = z.object({
  row: z.number(),
  status: z.enum(['success', 'failed']),
  to: z.string().optional(),
  amount: z.string().optional(),
  transactionId: z.string().optional(),
  errorMessage: z.string().optional(),
});

export const BatchAirdropOutputSchema = z.object({
  total: z.number(),
  succeeded: z.number(),
  failed: z.number(),
  tokenId: EntityIdSchema,
  fromAccount: z.string(),
  network: NetworkSchema,
  dryRun: z.boolean(),
  results: z.array(BatchAirdropRowResultSchema),
});

export type BatchAirdropOutput = z.infer<typeof BatchAirdropOutputSchema>;

export const BATCH_AIRDROP_TEMPLATE = `
{{#if dryRun}}
🔍 Dry run complete — no transactions were submitted.
{{else}}
✅ Batch airdrop complete!
{{/if}}

Token: {{hashscanLink tokenId "token" network}}
From: {{fromAccount}}
Network: {{network}}
Total: {{total}} | Succeeded: {{succeeded}} | Failed: {{failed}}

{{#each results}}
  Row {{row}}: {{status}}{{#if transactionId}} — {{hashscanLink transactionId "transaction" ../network}}{{/if}}{{#if errorMessage}} — {{errorMessage}}{{/if}}
{{/each}}
{{#if failed}}

⚠️  {{failed}} airdrop(s) failed. Fix the errors above and re-run with a CSV containing only the failed rows.
Tip: If recipients lack auto-association slots, they can claim pending airdrops via the Hedera portal.
{{/if}}
`.trim();
