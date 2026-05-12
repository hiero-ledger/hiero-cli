import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

export const PendingAirdropEntrySchema = z.object({
  tokenId: EntityIdSchema,
  tokenName: z.string(),
  tokenSymbol: z.string(),
  senderId: EntityIdSchema,
  type: z.enum(['FUNGIBLE', 'NFT']),
  amount: z.number().optional(),
  serialNumber: z.number().optional(),
});

export const TokenPendingAirdropsOutputSchema = z.object({
  account: EntityIdSchema,
  network: NetworkSchema,
  airdrops: z.array(PendingAirdropEntrySchema),
  hasMore: z.boolean(),
  total: z.number(),
});

export type TokenPendingAirdropsOutput = z.infer<
  typeof TokenPendingAirdropsOutputSchema
>;

export const TOKEN_PENDING_AIRDROPS_TEMPLATE = `
Pending Airdrops for {{account}} ({{network}})
{{#if airdrops.length}}

{{#each airdrops}}
{{#if (eq type "FUNGIBLE")}}
  {{add1 @index}}. {{tokenName}} ({{tokenSymbol}}) [{{tokenId}}]
       From: {{senderId}}   Amount: {{amount}}
{{else}}
  {{add1 @index}}. {{tokenName}} ({{tokenSymbol}}) [{{tokenId}}]
       From: {{senderId}}   Serial: #{{serialNumber}}
{{/if}}
{{/each}}
Total: {{total}} pending airdrop(s)
──────────────────────────────────────────────────
  To claim: hcli token claim-airdrop --account {{account}} --index <number(s)>
{{else}}
  No pending airdrops found.
{{/if}}
{{#if hasMore}}
──────────────────────────────────────────────────
  Use --show-all to fetch all results
{{/if}}
`.trim();
