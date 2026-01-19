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
export const MintFtOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  amount: TokenAmountSchema.describe('Amount minted in base units'),
  network: NetworkSchema,
});

export type MintFtOutput = z.infer<typeof MintFtOutputSchema>;

/**
 * Human-readable template for mint-ft output
 */
export const MINT_FT_TEMPLATE = `
✅ Token mint successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   Amount minted: {{amount}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
