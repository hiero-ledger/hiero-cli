import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

export const TokenAllowanceNftListEntrySchema = z.object({
  tokenId: EntityIdSchema,
  tokenName: z.string().optional(),
  tokenSymbol: z.string().optional(),
  spenderAccountId: EntityIdSchema,
  approvedForAll: z.boolean(),
  serialNumbers: z.array(z.number()),
});

export const TokenAllowanceNftListOutputSchema = z.object({
  accountId: EntityIdSchema,
  network: NetworkSchema,
  raw: z.boolean(),
  allowances: z.array(TokenAllowanceNftListEntrySchema),
  total: z.number(),
  hasMore: z.boolean(),
});

export type TokenAllowanceNftListOutput = z.infer<
  typeof TokenAllowanceNftListOutputSchema
>;

const TOKEN_METADATA =
  `{{#if tokenSymbol}} ({{tokenSymbol}}){{/if}}` +
  `{{#if tokenName}} - {{tokenName}}{{/if}}`;

export const TOKEN_ALLOWANCE_NFT_LIST_TEMPLATE = `
NFT Allowances for {{accountId}} ({{network}})
{{#if allowances.length}}

{{#each allowances}}
  {{add1 @index}}. Token: {{hashscanLink tokenId "token" ../network}}${TOKEN_METADATA}
       Spender: {{spenderAccountId}}   Scope: {{#if approvedForAll}}all serials{{else}}serials: {{#each serialNumbers}}#{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{/each}}
Total: {{total}} allowance group(s)
{{else}}
  No NFT allowances found.
{{/if}}
{{#if hasMore}}

Use --show-all to fetch all results.
{{/if}}
`.trim();
