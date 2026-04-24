/**
 * Dissociate Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenDissociateOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  accountId: EntityIdSchema,
  tokenId: EntityIdSchema,
  network: NetworkSchema,
});

export type TokenDissociateOutput = z.infer<typeof TokenDissociateOutputSchema>;

export const TOKEN_DISSOCIATE_TEMPLATE = `
✅ Token dissociation successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   Account ID: {{hashscanLink accountId "account" network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
