import { z } from 'zod';

export const SwapAddHbarOutputSchema = z.object({
  swapName: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  transferCount: z.number(),
  maxTransfers: z.number(),
});

export type SwapAddHbarOutput = z.infer<typeof SwapAddHbarOutputSchema>;

export const SWAP_ADD_HBAR_TEMPLATE = `
Transfer added to swap "{{swapName}}" [{{transferCount}}/{{maxTransfers}}]:

  HBAR   {{from}} → {{to}}   {{amount}}
`.trim();
