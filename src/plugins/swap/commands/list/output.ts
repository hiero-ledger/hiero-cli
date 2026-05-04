import { z } from 'zod';

import { SwapTransferType } from '@/plugins/swap/schema';

const SwapTransferDisplaySchema = z.object({
  index: z.number(),
  type: z.enum(SwapTransferType),
  from: z.string(),
  to: z.string(),
  detail: z.string(),
});

const SwapDisplaySchema = z.object({
  name: z.string(),
  memo: z.string().optional(),
  transferCount: z.number(),
  maxTransfers: z.number(),
  transfers: z.array(SwapTransferDisplaySchema),
});

export const SwapListOutputSchema = z.object({
  totalCount: z.number(),
  swaps: z.array(SwapDisplaySchema),
});

export type SwapListOutput = z.infer<typeof SwapListOutputSchema>;

export const SWAP_LIST_TEMPLATE = `
{{#if (eq totalCount 0)}}No saved swaps. Create one with: hcli swap create -n <name>
{{else}}Saved swaps ({{totalCount}}):
{{#each swaps}}
  {{name}}  [{{transferCount}}/{{maxTransfers}} transfers]{{#if memo}}  Memo: {{memo}}{{/if}}
{{#if (eq transferCount 0)}}  (no transfers added yet)
{{else}}{{#each transfers}}  {{index}}.  {{type}}   {{from}} → {{to}}   {{detail}}
{{/each}}{{/if}}
{{/each}}{{/if}}
`.trim();
