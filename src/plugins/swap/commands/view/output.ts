import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas';
import { SwapTransferType } from '@/plugins/swap/schema';

const SwapTransferDetailSchema = z.object({
  index: z.number().int().min(1),
  type: z.enum(SwapTransferType),
  from: z.string(),
  to: z.string(),
  detail: z.string(),
});

export const SwapViewOutputSchema = z.object({
  name: AliasNameSchema,
  memo: z.string().optional(),
  transferCount: z.number().int().min(0),
  maxTransfers: z.number().int().min(0),
  transfers: z.array(SwapTransferDetailSchema),
});

export type SwapViewOutput = z.infer<typeof SwapViewOutputSchema>;

export const SWAP_VIEW_TEMPLATE = `
Swap "{{name}}"  [{{transferCount}}/{{maxTransfers}} transfers]{{#if memo}}  Memo: {{memo}}{{/if}}
{{#if (eq transferCount 0)}}  (no transfers added yet)
{{else}}{{#each transfers}}  {{index}}.  {{type}}   {{from}} → {{to}}   {{detail}}
{{/each}}{{/if}}
`.trim();
