import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TokenAmountSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenWipeNftOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  accountId: EntityIdSchema,
  serialNumbers: z
    .array(z.number().int().positive())
    .describe('Wiped serial numbers'),
  newTotalSupply: TokenAmountSchema.describe('New total supply after wipe'),
  network: NetworkSchema,
});

export type TokenWipeNftOutput = z.infer<typeof TokenWipeNftOutputSchema>;

export const TOKEN_WIPE_NFT_TEMPLATE = `
✅ NFT wipe successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   Account: {{accountId}}
   Wiped serials: {{serialNumbers}}
   New total supply: {{newTotalSupply}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
