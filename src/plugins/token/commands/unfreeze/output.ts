import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenUnfreezeOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  accountId: EntityIdSchema,
  network: NetworkSchema,
});

export type TokenUnfreezeOutput = z.infer<typeof TokenUnfreezeOutputSchema>;

export const TOKEN_UNFREEZE_TEMPLATE = `
✅ Account unfrozen successfully!
   Account: {{accountId}}
   Token: {{hashscanLink tokenId "token" network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
