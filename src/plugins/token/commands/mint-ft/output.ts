/**
 * Mint FT Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TokenAmountSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Mint FT Command Output Schema
 */
export const TokenMintFtOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  amount: TokenAmountSchema.describe('Amount minted in base units'),
  network: NetworkSchema,
});

export type TokenMintFtOutput = z.infer<typeof TokenMintFtOutputSchema>;

/**
 * Human-readable template for mint-ft output
 */
export const TOKEN_MINT_FT_TEMPLATE = `
✅ FT mint successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   Amount minted: {{amount}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
