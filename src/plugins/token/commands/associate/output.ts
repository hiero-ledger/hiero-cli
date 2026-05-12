import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenAssociateOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  accountId: EntityIdSchema,
  tokenId: EntityIdSchema,
  network: NetworkSchema,
});

export type TokenAssociateOutput = z.infer<typeof TokenAssociateOutputSchema>;

export const TOKEN_ASSOCIATE_TEMPLATE = `
✅ Token association successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   Account ID: {{hashscanLink accountId "account" network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
