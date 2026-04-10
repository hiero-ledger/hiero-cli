import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const RejectedAirdropSchema = z.object({
  tokenId: EntityIdSchema,
  tokenName: z.string(),
  tokenSymbol: z.string(),
  senderId: EntityIdSchema,
  type: z.enum(['FUNGIBLE', 'NFT']),
  amount: z.number().optional(),
  serialNumber: z.number().optional(),
});

export const TokenRejectAirdropOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  ownerAccountId: EntityIdSchema,
  rejected: z.array(RejectedAirdropSchema),
  network: NetworkSchema,
});

export type TokenRejectAirdropOutput = z.infer<
  typeof TokenRejectAirdropOutputSchema
>;

export const TOKEN_REJECT_AIRDROP_TEMPLATE = `
✅ Airdrop(s) rejected successfully!
   Owner: {{hashscanLink ownerAccountId "account" network}}
   Rejected ({{rejected.length}}):
{{#each rejected}}
{{#if (eq type "FUNGIBLE")}}
   {{add1 @index}}. {{tokenName}} ({{tokenSymbol}}) [{{tokenId}}] — Amount: {{amount}}
{{else}}
   {{add1 @index}}. {{tokenName}} ({{tokenSymbol}}) [{{tokenId}}] — Serial: #{{serialNumber}}
{{/if}}
{{/each}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
