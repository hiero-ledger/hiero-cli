import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas';

export const TokenUpdateNftMetadataOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  serialNumbers: z
    .array(z.number())
    .describe('Serial numbers of the updated NFTs'),
  network: NetworkSchema,
});

export type TokenUpdateNftMetadataOutput = z.infer<
  typeof TokenUpdateNftMetadataOutputSchema
>;

export const TOKEN_UPDATE_NFT_METADATA_TEMPLATE = `
✅ NFT metadata update successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   Updated serials: {{serialNumbers}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
