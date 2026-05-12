import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenAllowanceNftOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  ownerAccountId: EntityIdSchema,
  spenderAccountId: EntityIdSchema,
  serials: z
    .array(z.number())
    .nullable()
    .describe('Approved serial numbers, null if all serials approved'),
  allSerials: z
    .boolean()
    .describe('Whether all serials in the collection were approved'),
  network: NetworkSchema,
});

export type TokenAllowanceNftOutput = z.infer<
  typeof TokenAllowanceNftOutputSchema
>;

export const TOKEN_ALLOWANCE_NFT_TEMPLATE = `
✅ NFT allowance approved successfully!
   Token ID: {{hashscanLink tokenId "token" network}}
   Owner: {{hashscanLink ownerAccountId "account" network}}
   Spender: {{hashscanLink spenderAccountId "account" network}}
{{#if allSerials}}
   Scope: All serials in collection
{{else}}
   Serials: {{serials}}
{{/if}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
