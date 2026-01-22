import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas';

/**
 * Output schema for mint-nft command
 */
export const MintNftOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  serialNumber: z.string().describe('Serial number of the minted NFT'),
  network: NetworkSchema,
});

export type MintNftOutput = z.infer<typeof MintNftOutputSchema>;

export const MINT_NFT_TEMPLATE = `
✅ NFT mint successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   Serial Number: {{serialNumber}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
