import { z } from 'zod';

import {
  AliasNameSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';
import { SwapTransferType } from '@/plugins/swap/schema';

export const SwapTransferSummarySchema = z.object({
  type: z.enum(SwapTransferType),
  from: z.string(),
  to: z.string(),
  detail: z.string(),
});

export const SwapExecuteOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  network: NetworkSchema,
  swapName: AliasNameSchema,
  transferCount: z.number().int().min(0),
  transfers: z.array(SwapTransferSummarySchema),
});

export type SwapTransferSummary = z.infer<typeof SwapTransferSummarySchema>;
export type SwapExecuteOutput = z.infer<typeof SwapExecuteOutputSchema>;

export const SWAP_EXECUTE_TEMPLATE = `
Swap "{{swapName}}" executed successfully.

Transaction ID: {{hashscanLink transactionId "transaction" network}}
Network:        {{network}}
Transfers:      {{transferCount}}
{{#each transfers}}
  {{add1 @index}}. {{type}}   {{from}} → {{to}}   {{detail}}
{{/each}}
`.trim();
