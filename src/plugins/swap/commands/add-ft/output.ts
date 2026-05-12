import { z } from 'zod';

export const SwapAddFtOutputSchema = z.object({
  swapName: z.string(),
  from: z.string(),
  to: z.string(),
  token: z.string(),
  amount: z.string(),
  transferCount: z.number(),
  maxTransfers: z.number(),
});

export type SwapAddFtOutput = z.infer<typeof SwapAddFtOutputSchema>;

export const SWAP_ADD_FT_TEMPLATE = `
Transfer added to swap "{{swapName}}" [{{transferCount}}/{{maxTransfers}}]:

  FT   {{from}} → {{to}}   token: {{token}}   {{amount}}
`.trim();
