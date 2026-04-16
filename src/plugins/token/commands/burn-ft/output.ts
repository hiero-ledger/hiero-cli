import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TokenAmountSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenBurnFtOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  amount: TokenAmountSchema.describe('Amount burned in base units'),
  newTotalSupply: TokenAmountSchema.describe('New total supply after burn'),
  network: NetworkSchema,
});

export type TokenBurnFtOutput = z.infer<typeof TokenBurnFtOutputSchema>;

export const TOKEN_BURN_FT_TEMPLATE = `
✅ FT burn successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   Amount burned: {{amount}}
   New total supply: {{newTotalSupply}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
