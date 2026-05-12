import { z } from 'zod';

export const SwapDeleteOutputSchema = z.object({
  name: z.string(),
});

export type SwapDeleteOutput = z.infer<typeof SwapDeleteOutputSchema>;

export const SWAP_DELETE_TEMPLATE = `Swap "{{name}}" deleted.`;
