import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenPauseOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  network: NetworkSchema,
});

export type TokenPauseOutput = z.infer<typeof TokenPauseOutputSchema>;

export const TOKEN_PAUSE_TEMPLATE = `
✅ Token paused successfully!
   Token: {{hashscanLink tokenId "token" network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
