import { z } from 'zod';

export const SwapDeleteInputSchema = z.object({
  name: z.string().min(1).describe('Name of the swap to delete'),
});

export type SwapDeleteInput = z.infer<typeof SwapDeleteInputSchema>;
