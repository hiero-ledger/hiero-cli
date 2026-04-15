import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenFreezeOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  accountId: EntityIdSchema,
  network: NetworkSchema,
});

export type TokenFreezeOutput = z.infer<typeof TokenFreezeOutputSchema>;

export const TOKEN_FREEZE_TEMPLATE = `
✅ Account frozen successfully!
   Account: {{accountId}}
   Token: {{hashscanLink tokenId "token" network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
