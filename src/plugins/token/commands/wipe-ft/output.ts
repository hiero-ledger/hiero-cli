import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TokenAmountSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenWipeFtOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  accountId: EntityIdSchema,
  amount: TokenAmountSchema.describe('Amount wiped in base units'),
  newTotalSupply: TokenAmountSchema.describe('New total supply after wipe'),
  network: NetworkSchema,
});

export type TokenWipeFtOutput = z.infer<typeof TokenWipeFtOutputSchema>;

export const TOKEN_WIPE_FT_TEMPLATE = `
✅ FT wipe successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   Account: {{accountId}}
   Amount wiped: {{amount}}
   New total supply: {{newTotalSupply}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
