import { z } from 'zod';

export const SwapAddNftOutputSchema = z.object({
  swapName: z.string(),
  from: z.string(),
  to: z.string(),
  token: z.string(),
  serials: z.array(z.number()),
  transferCount: z.number(),
  maxTransfers: z.number(),
});

export type SwapAddNftOutput = z.infer<typeof SwapAddNftOutputSchema>;

export const SWAP_ADD_NFT_TEMPLATE = `
Transfer added to swap "{{swapName}}" [{{transferCount}}/{{maxTransfers}}]:

  NFT   {{from}} → {{to}}   token: {{token}}   serials: {{serials}}
`.trim();
