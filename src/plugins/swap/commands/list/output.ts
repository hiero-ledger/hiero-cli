import { z } from 'zod';

const SwapDisplaySchema = z.object({
  name: z.string(),
  memo: z.string().optional(),
  transferCount: z.number().int().min(0),
  maxTransfers: z.number().int().min(0),
});

export const SwapListOutputSchema = z.object({
  totalCount: z.number().int().min(0),
  swaps: z.array(SwapDisplaySchema),
});

export type SwapListOutput = z.infer<typeof SwapListOutputSchema>;

export const SWAP_LIST_TEMPLATE = `
{{#if (eq totalCount 0)}}No saved swaps. Create one with: hcli swap create -n <name>
{{else}}Saved swaps ({{totalCount}}):
{{#each swaps}}  {{name}}  [{{transferCount}}/{{maxTransfers}} transfers]{{#if memo}}  Memo: {{memo}}{{/if}}
{{/each}}{{/if}}
`.trim();
