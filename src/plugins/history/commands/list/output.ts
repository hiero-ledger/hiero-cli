import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

const TransactionRecordSchema = z.object({
  transactionId: z.string().describe('Transaction ID'),
  consensusTimestamp: z.string().describe('Consensus timestamp'),
  type: z.string().describe('Transaction type'),
  result: z.string().describe('Transaction result (SUCCESS, FAIL, etc.)'),
  chargedFee: z.number().describe('Charged transaction fee in tinybars'),
  memo: z.string().optional().describe('Transaction memo if present'),
  transfers: z
    .array(
      z.object({
        account: z.string(),
        amount: z.number(),
      }),
    )
    .optional()
    .describe('HBAR transfers'),
  tokenTransfers: z
    .array(
      z.object({
        account: z.string(),
        amount: z.number(),
        tokenId: z.string(),
      }),
    )
    .optional()
    .describe('Token transfers'),
});

export const ListHistoryOutputSchema = z.object({
  accountId: EntityIdSchema,
  network: NetworkSchema,
  transactions: z.array(TransactionRecordSchema),
  totalCount: z.number().describe('Number of transactions returned'),
});

export type TransactionRecord = z.infer<typeof TransactionRecordSchema>;
export type ListHistoryOutput = z.infer<typeof ListHistoryOutputSchema>;

export const LIST_HISTORY_TEMPLATE = `
📜 Transaction History for {{hashscanLink accountId "account" network}}
Network: {{network}}
Showing {{totalCount}} transaction(s)

{{#each transactions}}
────────────────────────────────────────
🔹 {{type}} | {{result}}
   ID: {{transactionId}}
   Time: {{consensusTimestamp}}
   Fee: {{chargedFee}} tinybars
{{#if memo}}
   Memo: {{memo}}
{{/if}}
{{#if transfers}}
   Transfers:
{{#each transfers}}
     {{account}}: {{amount}} tinybars
{{/each}}
{{/if}}
{{#if tokenTransfers}}
   Token Transfers:
{{#each tokenTransfers}}
     {{account}}: {{amount}} ({{tokenId}})
{{/each}}
{{/if}}
{{/each}}
`.trim();
