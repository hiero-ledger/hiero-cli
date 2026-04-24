import { z } from 'zod';

import {
  EntityIdSchema,
  HtsBaseUnitSchema,
  NetworkSchema,
  TinybarSchema,
} from '@/core/schemas';

export const AccountBalanceOutputSchema = z.object({
  accountId: EntityIdSchema,
  hbarBalance: TinybarSchema.optional(),
  hbarBalanceDisplay: z.string().optional(),
  hbarOnly: z.boolean().optional(),
  tokenOnly: z.boolean().optional(),
  raw: z.boolean().optional(),
  network: NetworkSchema,
  tokenBalances: z
    .array(
      z.object({
        tokenId: EntityIdSchema,
        name: z.string().optional(),
        symbol: z.string().optional(),
        alias: z.string().optional(),
        balance: HtsBaseUnitSchema,
        balanceDisplay: z.string().optional(),
        decimals: z.number().optional(),
      }),
    )
    .optional(),
  nftBalances: z
    .object({
      collections: z.array(
        z.object({
          tokenId: EntityIdSchema,
          name: z.string().optional(),
          symbol: z.string().optional(),
          alias: z.string().optional(),
          serialNumbers: z.array(z.number()),
          count: z.number(),
        }),
      ),
      totalCount: z.number(),
      truncated: z.boolean(),
    })
    .optional(),
});

export type AccountBalanceOutput = z.infer<typeof AccountBalanceOutputSchema>;

const HBAR_SECTION =
  `{{#unless tokenOnly}}` +
  `💰 Account Balance: {{#if raw}}{{hbarBalance}} tinybars{{else}}{{hbarBalanceDisplay}} HBAR{{/if}}\n` +
  `{{/unless}}`;

const FT_TOKEN_ROW =
  `{{hashscanLink tokenId "token" ../network}}` +
  `{{#if alias}} ({{alias}}){{/if}}: ` +
  `{{#if ../raw}}{{balance}}{{else}}{{#if balanceDisplay}}{{balanceDisplay}}{{else}}{{balance}}{{/if}}{{/if}}` +
  `{{#if symbol}} {{symbol}}{{/if}}` +
  `{{#if name}} ({{name}}){{/if}}`;

const FT_SECTION =
  `{{#if tokenBalances}}\n` +
  `🪙 {{#if tokenOnly}}Token Balance{{else}}Token Balances{{/if}}:\n` +
  `{{#each tokenBalances}}   ${FT_TOKEN_ROW}\n{{/each}}` +
  `{{else}}` +
  `{{#unless tokenOnly}}\n   No token balances found{{/unless}}` +
  `{{#if tokenOnly}}\n   Token not found or no balance{{/if}}` +
  `{{/if}}`;

const NFT_COLLECTION_ROW =
  `{{hashscanLink tokenId "token" ../network}}` +
  `{{#if alias}} ({{alias}}){{/if}}` +
  `{{#if name}} — {{name}}{{/if}}: ` +
  `{{#each serialNumbers}}#{{this}}{{#unless @last}}, {{/unless}}{{/each}}`;

const NFT_SECTION =
  `{{#if nftBalances}}\n` +
  `🖼  NFT Balances (` +
  `{{nftBalances.totalCount}} NFT{{#if (gt nftBalances.totalCount 1)}}s{{/if}} in ` +
  `{{length nftBalances.collections}} collection{{#if (gt (length nftBalances.collections) 1)}}s{{/if}}` +
  `):\n` +
  `{{#if nftBalances.truncated}}   (Showing first 100 NFTs)\n{{/if}}` +
  `{{#each nftBalances.collections}}   ${NFT_COLLECTION_ROW}\n{{/each}}` +
  `{{/if}}`;

export const ACCOUNT_BALANCE_TEMPLATE = (
  HBAR_SECTION +
  `{{#unless hbarOnly}}` +
  FT_SECTION +
  NFT_SECTION +
  `{{/unless}}`
).trim();
