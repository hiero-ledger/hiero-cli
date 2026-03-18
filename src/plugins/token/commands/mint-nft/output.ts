import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas';

/**
 * Output schema for mint-nft command
 */
export const TokenMintNftOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  serialNumber: z.string().describe('Serial number of the minted NFT'),
  network: NetworkSchema,
});

export type TokenMintNftOutput = z.infer<typeof TokenMintNftOutputSchema>;

export const TOKEN_MINT_NFT_TEMPLATE = `
✅ NFT mint successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   Serial Number: {{serialNumber}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
