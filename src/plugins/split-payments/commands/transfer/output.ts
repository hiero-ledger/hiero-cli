import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TinybarSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/** Single transfer result (success or failure) */
export const TransferItemResultSchema = z.object({
  toAccountId: z
    .string()
    .describe('Recipient account ID or raw input if invalid'),
  amountTinybar: TinybarSchema,
  transactionId: TransactionIdSchema.optional(),
  status: z.enum(['success', 'failure']),
  errorMessage: z.string().optional(),
});

export type TransferItemResult = z.infer<typeof TransferItemResultSchema>;

/** Full batch output */
export const SplitPaymentsTransferOutputSchema = z.object({
  network: NetworkSchema,
  fromAccountId: EntityIdSchema,
  totalTransfers: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  dryRun: z.boolean().optional(),
  transfers: z.array(TransferItemResultSchema),
});

export type SplitPaymentsTransferOutput = z.infer<
  typeof SplitPaymentsTransferOutputSchema
>;

export const SPLIT_PAYMENTS_TRANSFER_TEMPLATE = `
{{#if dryRun}}
✅ Dry run — no transfers sent

Network: {{network}}
From: {{hashscanLink fromAccountId "account" network}}
Total: {{totalTransfers}} | Valid: {{successCount}} | Invalid: {{failureCount}}

{{#each transfers}}
{{#if_eq status "success"}}
  ✓ Would send {{amountTinybar}} tinybars → {{toAccountId}}
{{else}}
  ✗ {{toAccountId}} — {{amountTinybar}} tinybars — {{errorMessage}}
{{/if_eq}}
{{/each}}
{{else}}
✅ Split payments completed

Network: {{network}}
From: {{hashscanLink fromAccountId "account" network}}
Total: {{totalTransfers}} | Success: {{successCount}} | Failed: {{failureCount}}

{{#each transfers}}
{{#if_eq status "success"}}
  ✓ {{toAccountId}} — {{amountTinybar}} tinybars — {{#if transactionId}}{{hashscanLink transactionId "transaction" ../network}}{{else}}-{{/if}}
{{else}}
  ✗ {{toAccountId}} — {{amountTinybar}} tinybars — {{errorMessage}}
{{/if_eq}}
{{/each}}
{{/if}}
`.trim();
