import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TokenAmountSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenAllowanceFtOutputSchema = z.object({
  tokenId: EntityIdSchema,
  ownerAccountId: EntityIdSchema,
  spenderAccountId: EntityIdSchema,
  amount: TokenAmountSchema.describe('Approved allowance amount in base units'),
  transactionId: TransactionIdSchema,
  network: NetworkSchema,
});

export type TokenAllowanceFtOutput = z.infer<
  typeof TokenAllowanceFtOutputSchema
>;

export const TOKEN_ALLOWANCE_FT_TEMPLATE = `
✅ Fungible token allowance approved successfully
   Token: {{hashscanLink tokenId "token" network}}
   Owner: {{hashscanLink ownerAccountId "account" network}}
   Spender: {{hashscanLink spenderAccountId "account" network}}
   Amount: {{amount}}
   Network: {{network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
