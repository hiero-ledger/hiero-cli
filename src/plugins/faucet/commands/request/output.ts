import { z } from 'zod';

import {
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const FaucetRequestOutputSchema = z.object({
  recipient: z.string(),
  amount: z.number(),
  transactionId: TransactionIdSchema,
  network: NetworkSchema,
  quotaUsed: z.number(),
  quotaRemaining: z.number(),
});

export type FaucetRequestOutput = z.infer<typeof FaucetRequestOutputSchema>;

export const FAUCET_REQUEST_TEMPLATE = `
Faucet request successful!

  Amount:         {{amount}} HBAR
  Recipient:      {{recipient}}
  Network:        {{network}}
  Transaction ID: {{hashscanLink transactionId "transaction" network}}
  Daily quota:    {{quotaUsed}} HBAR used / {{quotaRemaining}} HBAR remaining
`.trim();
