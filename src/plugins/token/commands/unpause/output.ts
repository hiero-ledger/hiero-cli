import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenUnpauseOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  network: NetworkSchema,
});

export type TokenUnpauseOutput = z.infer<typeof TokenUnpauseOutputSchema>;

export const TOKEN_UNPAUSE_TEMPLATE = `
✅ Token unpaused successfully!
   Token: {{hashscanLink tokenId "token" network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
