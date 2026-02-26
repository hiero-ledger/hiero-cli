import { z } from 'zod';

import {
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const SwapExecuteOutputSchema = z.object({
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  tokenIn: z.string(),
  tokenOut: z.string(),
  amountIn: z.string(),
  amountOut: z.string(),
});

export type SwapExecuteOutput = z.infer<typeof SwapExecuteOutputSchema>;

export const SWAP_EXECUTE_TEMPLATE = `
✅ Swap executed

Network: {{network}}
Transaction: {{hashscanLink transactionId "transaction" network}}
In:  {{tokenIn}}  →  {{amountIn}}
Out: {{tokenOut}}  →  {{amountOut}}
`.trim();
