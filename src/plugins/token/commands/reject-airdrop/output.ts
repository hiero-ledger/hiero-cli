import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const RejectedTokenSchema = z.object({
  tokenId: EntityIdSchema,
  tokenName: z.string(),
  tokenSymbol: z.string(),
  type: z.enum(['FUNGIBLE', 'NFT']),
  serialNumbers: z.array(z.number()).optional(),
});

export const TokenRejectAirdropOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  ownerAccountId: EntityIdSchema,
  rejected: RejectedTokenSchema,
  network: NetworkSchema,
});

export type TokenRejectAirdropOutput = z.infer<
  typeof TokenRejectAirdropOutputSchema
>;

export const TOKEN_REJECT_AIRDROP_TEMPLATE = `
✅ Token rejected successfully!
   Owner: {{hashscanLink ownerAccountId "account" network}}
   Token: {{rejected.tokenName}} ({{rejected.tokenSymbol}}) [{{hashscanLink rejected.tokenId "token" network}}]
{{#if (eq rejected.type "NFT")}}
   Serials: {{#each rejected.serialNumbers}}#{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
