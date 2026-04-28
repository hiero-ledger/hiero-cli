import { z } from 'zod';

import { SwapTransferType } from '@/core/services/transfer/types';

export const SwapListOutputSchema = z.object({
  swaps: z.array(
    z.object({
      name: z.string(),
      network: z.string(),
      executed: z.boolean(),
      createdAt: z.string(),
      transferCount: z.number().int(),
      transfers: z.array(
        z.object({
          index: z.number().int(),
          type: z.nativeEnum(SwapTransferType),
          fromAccount: z.string(),
          toAccount: z.string(),
          amount: z.string(),
          tokenId: z.string().optional(),
        }),
      ),
    }),
  ),
  totalCount: z.number().int(),
});

export type SwapListOutput = z.infer<typeof SwapListOutputSchema>;

export const SWAP_LIST_TEMPLATE = `
{{#if (eq totalCount 0)}}
📝 No swaps found
{{else}}
📝 Found {{totalCount}} swap(s):

{{#each swaps}}
{{add1 @index}}. {{name}}  [{{#if executed}}executed{{else}}pending{{/if}}]  {{network}}  {{createdAt}}
{{#if (eq transferCount 0)}}
   No transfers added yet
{{else}}
{{#each transfers}}
   transfer {{index}}  {{type}}  {{fromAccount}} → {{toAccount}}  {{amount}}{{#if tokenId}} (token: {{tokenId}}){{/if}}
{{/each}}
{{/if}}

{{/each}}
{{/if}}
`.trim();
