import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenTransferNftOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  from: EntityIdSchema,
  to: EntityIdSchema,
  serials: z.array(z.number()).describe('NFT serial numbers transferred'),
  network: NetworkSchema,
});

export type TokenTransferNftOutput = z.infer<
  typeof TokenTransferNftOutputSchema
>;

export const TOKEN_TRANSFER_NFT_TEMPLATE = `
✅ NFT transfer successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   From: {{hashscanLink from "account" network}}
   To: {{hashscanLink to "account" network}}
   Serials: {{serials}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
