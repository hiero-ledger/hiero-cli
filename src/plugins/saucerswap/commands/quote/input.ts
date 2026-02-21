import { z } from 'zod';

/**
 * --in: HBAR or token ID (0.0.x) or alias
 * --out: HBAR or token ID or alias
 * --amount: amount of input token (display or with t for smallest unit)
 */
export const SwapQuoteInputSchema = z.object({
  in: z
    .string()
    .min(1, 'Input token is required (use HBAR or token ID 0.0.x)')
    .describe('Input: HBAR or token ID or alias'),
  out: z
    .string()
    .min(1, 'Output token is required')
    .describe('Output: HBAR or token ID or alias'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .describe('Amount of input token (e.g. 10 or 100t for smallest unit)'),
});

export type SwapQuoteInput = z.infer<typeof SwapQuoteInputSchema>;
