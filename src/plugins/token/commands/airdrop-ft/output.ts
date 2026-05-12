import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TokenAmountSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenAirdropFtOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  from: EntityIdSchema,
  recipients: z.array(
    z.object({
      to: EntityIdSchema,
      amount: TokenAmountSchema.describe('Amount airdropped in base units'),
    }),
  ),
  network: NetworkSchema,
});

export type TokenAirdropFtOutput = z.infer<typeof TokenAirdropFtOutputSchema>;

export const TOKEN_AIRDROP_FT_TEMPLATE = `
✅ Fungible token airdrop successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   From: {{hashscanLink from "account" network}}
   Recipients ({{length recipients}}):
{{#each recipients}}
   {{add1 @index}}. {{hashscanLink to "account" ../network}} — Amount: {{amount}}
{{/each}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
