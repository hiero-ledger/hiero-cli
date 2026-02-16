/**
 * Batch Mint NFT Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

const BatchMintNftRowResultSchema = z.object({
  row: z.number(),
  status: z.enum(['success', 'failed']),
  metadata: z.string().optional(),
  serialNumber: z.number().optional(),
  transactionId: z.string().optional(),
  errorMessage: z.string().optional(),
});

export const BatchMintNftOutputSchema = z.object({
  total: z.number(),
  succeeded: z.number(),
  failed: z.number(),
  tokenId: EntityIdSchema,
  network: NetworkSchema,
  dryRun: z.boolean(),
  results: z.array(BatchMintNftRowResultSchema),
});

export type BatchMintNftOutput = z.infer<typeof BatchMintNftOutputSchema>;

export const BATCH_MINT_NFT_TEMPLATE = `
{{#if dryRun}}
🔍 Dry run complete — no transactions were submitted.
{{else}}
✅ Batch NFT mint complete!
{{/if}}

Token: {{hashscanLink tokenId "token" network}}
Network: {{network}}
Total: {{total}} | Succeeded: {{succeeded}} | Failed: {{failed}}

{{#each results}}
  Row {{row}}: {{status}}{{#if serialNumber}} — Serial #{{serialNumber}}{{/if}}{{#if transactionId}} — {{hashscanLink transactionId "transaction" ../network}}{{/if}}{{#if errorMessage}} — {{errorMessage}}{{/if}}
{{/each}}
{{#if failed}}

⚠️  {{failed}} mint(s) failed. Fix the errors above and re-run with a CSV containing only the failed rows.
{{/if}}
`.trim();
