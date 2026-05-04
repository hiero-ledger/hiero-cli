import { z } from 'zod';

export const SwapExecuteInputSchema = z.object({
  name: z.string().min(1).describe('Name of the swap to execute'),
});

export type SwapExecuteInput = z.infer<typeof SwapExecuteInputSchema>;
