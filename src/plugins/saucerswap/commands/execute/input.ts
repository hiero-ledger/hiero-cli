import { z } from 'zod';

export const SwapExecuteInputSchema = z.object({
  in: z
    .string()
    .min(1, 'Input token is required (use HBAR or token ID 0.0.x)')
    .describe('Input: HBAR or token ID'),
  out: z
    .string()
    .min(1, 'Output token is required')
    .describe('Output: HBAR or token ID'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .describe('Amount of input token'),
  slippage: z
    .string()
    .optional()
    .default('0.5')
    .describe('Slippage tolerance in percent (e.g. 0.5 for 0.5%)'),
});

export type SwapExecuteInput = z.infer<typeof SwapExecuteInputSchema>;
