import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenCancelAirdropOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  sender: EntityIdSchema,
  receiver: EntityIdSchema,
  serial: z.number().nullable(),
  network: NetworkSchema,
});

export type TokenCancelAirdropOutput = z.infer<
  typeof TokenCancelAirdropOutputSchema
>;

export const TOKEN_CANCEL_AIRDROP_TEMPLATE = `
✅ Token airdrop cancelled!
   Token ID: {{hashscanLink tokenId "token" network}}
   Sender: {{hashscanLink sender "account" network}}
   Receiver: {{hashscanLink receiver "account" network}}
   {{#if serial}}Serial: {{serial}}
   {{/if}}Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
