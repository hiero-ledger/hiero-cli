import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TokenAmountSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenBurnNftOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  serialNumbers: z
    .array(z.number().int().positive())
    .describe('Burned serial numbers'),
  newTotalSupply: TokenAmountSchema.describe('New total supply after burn'),
  network: NetworkSchema,
});

export type TokenBurnNftOutput = z.infer<typeof TokenBurnNftOutputSchema>;

export const TOKEN_BURN_NFT_TEMPLATE = `
✅ NFT burn successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   Burned serials: {{serialNumbers}}
   New total supply: {{newTotalSupply}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
