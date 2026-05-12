import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const ClaimedAirdropSchema = z.object({
  tokenId: EntityIdSchema,
  tokenName: z.string(),
  tokenSymbol: z.string(),
  senderId: EntityIdSchema,
  type: z.enum(['FUNGIBLE', 'NFT']),
  amount: z.number().optional(),
  serialNumber: z.number().optional(),
});

export const TokenClaimAirdropOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  receiverAccountId: EntityIdSchema,
  claimed: z.array(ClaimedAirdropSchema),
  network: NetworkSchema,
});

export type TokenClaimAirdropOutput = z.infer<
  typeof TokenClaimAirdropOutputSchema
>;

export const TOKEN_CLAIM_AIRDROP_TEMPLATE = `
✅ Airdrop(s) claimed successfully!
   Receiver: {{hashscanLink receiverAccountId "account" network}}
   Claimed ({{claimed.length}}):
{{#each claimed}}
{{#if (eq type "FUNGIBLE")}}
   {{add1 @index}}. {{tokenName}} ({{tokenSymbol}}) [{{tokenId}}] — Amount: {{amount}}
{{else}}
   {{add1 @index}}. {{tokenName}} ({{tokenSymbol}}) [{{tokenId}}] — Serial: #{{serialNumber}}
{{/if}}
{{/each}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
