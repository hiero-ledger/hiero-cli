import { z } from 'zod';

import {
  EntityIdSchema,
  HtsBaseUnitSchema,
  NetworkSchema,
} from '@/core/schemas/common-schemas';

export const TokenAllowanceFtListEntrySchema = z.object({
  tokenId: EntityIdSchema,
  tokenName: z.string().optional(),
  tokenSymbol: z.string().optional(),
  decimals: z.number().optional(),
  spenderAccountId: EntityIdSchema,
  amount: HtsBaseUnitSchema,
  amountDisplay: z.string().optional(),
});

export const TokenAllowanceFtListOutputSchema = z.object({
  accountId: EntityIdSchema,
  network: NetworkSchema,
  raw: z.boolean(),
  allowances: z.array(TokenAllowanceFtListEntrySchema),
  total: z.number(),
  hasMore: z.boolean(),
});

export type TokenAllowanceFtListOutput = z.infer<
  typeof TokenAllowanceFtListOutputSchema
>;

const TOKEN_METADATA =
  `{{#if tokenSymbol}} ({{tokenSymbol}}){{/if}}` +
  `{{#if tokenName}} - {{tokenName}}{{/if}}`;

export const TOKEN_ALLOWANCE_FT_LIST_TEMPLATE = `
FT Allowances for {{accountId}} ({{network}})
{{#if allowances.length}}

{{#each allowances}}
  {{add1 @index}}. Token: {{hashscanLink tokenId "token" ../network}}${TOKEN_METADATA}
       Spender: {{spenderAccountId}}   Amount: {{#if ../raw}}{{amount}}{{else}}{{#if amountDisplay}}{{amountDisplay}}{{else}}{{amount}}{{/if}}{{/if}}{{#if tokenSymbol}} {{tokenSymbol}}{{/if}}
{{/each}}
Total: {{total}} allowance(s)
{{else}}
  No fungible token allowances found.
{{/if}}
{{#if hasMore}}

Use --show-all to fetch all results.
{{/if}}
`.trim();
