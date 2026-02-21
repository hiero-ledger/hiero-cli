import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas/common-schemas';

export const SwapQuoteOutputSchema = z.object({
  network: NetworkSchema,
  tokenIn: z.string(),
  tokenOut: z.string(),
  amountIn: z.string(),
  amountOut: z.string(),
  amountOutRaw: z.string().describe('Output amount in token smallest unit'),
  gasEstimate: z.string().optional(),
});

export type SwapQuoteOutput = z.infer<typeof SwapQuoteOutputSchema>;

export const SWAP_QUOTE_TEMPLATE = `
Quote (exact input)

Network: {{network}}
In:  {{tokenIn}}  →  {{amountIn}}
Out: {{tokenOut}}  →  {{amountOut}} (raw: {{amountOutRaw}})
{{#if gasEstimate}}
Gas estimate: {{gasEstimate}}
{{/if}}
`.trim();
