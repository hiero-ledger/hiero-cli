import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenAirdropNftOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  from: EntityIdSchema,
  recipients: z.array(
    z.object({
      to: EntityIdSchema,
      serials: z.array(z.number()).describe('NFT serial numbers airdropped'),
    }),
  ),
  network: NetworkSchema,
});

export type TokenAirdropNftOutput = z.infer<typeof TokenAirdropNftOutputSchema>;

export const TOKEN_AIRDROP_NFT_TEMPLATE = `
✅ NFT airdrop successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   From: {{hashscanLink from "account" network}}
   Recipients ({{length recipients}}):
{{#each recipients}}
   {{add1 @index}}. {{hashscanLink to "account" ../network}} — Serials: {{serials}}
{{/each}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
