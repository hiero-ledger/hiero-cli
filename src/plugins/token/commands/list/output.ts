/**
 * List Tokens Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  PublicKeySchema,
  SupplyTypeSchema,
} from '@/core/schemas/common-schemas';
import { HederaTokenType } from '@/core/shared/constants';

/**
 * Token Keys Schema
 */
const TokenKeysSchema = z
  .object({
    adminKey: PublicKeySchema.nullable(),
    supplyKey: PublicKeySchema.nullable(),
    wipeKey: PublicKeySchema.nullable(),
    kycKey: PublicKeySchema.nullable(),
    freezeKey: PublicKeySchema.nullable(),
    pauseKey: PublicKeySchema.nullable(),
    feeScheduleKey: PublicKeySchema.nullable(),
    treasuryKey: PublicKeySchema.nullable(),
  })
  .describe('Token management keys');

/**
 * Token List Item Schema
 */
const TokenListItemSchema = z.object({
  tokenId: EntityIdSchema,
  name: z.string().describe('Token name'),
  symbol: z.string().describe('Token symbol'),
  decimals: z.int().min(0).max(8).describe('Number of decimal places'),
  supplyType: SupplyTypeSchema,
  tokenType: z
    .enum([HederaTokenType.NON_FUNGIBLE_TOKEN, HederaTokenType.FUNGIBLE_COMMON])
    .describe('Token type: FungibleCommon or NonFungibleToken'),
  treasuryId: EntityIdSchema,
  network: NetworkSchema,
  keys: TokenKeysSchema.optional(),
  alias: z.string().describe('Token alias').optional(),
  maxSupply: z.int().nonnegative().describe('Maximum supply for finite tokens'),
  associationCount: z
    .number()
    .int()
    .nonnegative()
    .describe('Number of associations'),
});

/**
 * Token Statistics Schema
 */
const TokenStatisticsSchema = z.object({
  total: z.int().nonnegative().describe('Total number of tokens'),
  withKeys: z
    .number()
    .int()
    .nonnegative()
    .describe('Tokens with management keys'),
  byNetwork: z
    .record(z.string(), z.int().nonnegative())
    .describe('Token count by network'),
  bySupplyType: z
    .record(z.string(), z.int().nonnegative())
    .describe('Token count by supply type'),
  withAssociations: z
    .number()
    .int()
    .nonnegative()
    .describe('Tokens with associations'),
  totalAssociations: z
    .number()
    .int()
    .nonnegative()
    .describe('Total number of associations'),
});

/**
 * List Tokens Command Output Schema
 */
export const ListTokensOutputSchema = z.object({
  tokens: z.array(TokenListItemSchema),
  totalCount: z.int().nonnegative().describe('Total number of tokens'),
  stats: TokenStatisticsSchema.optional(),
});

export type ListTokensOutput = z.infer<typeof ListTokensOutputSchema>;
export type TokenListItem = z.infer<typeof TokenListItemSchema>;

/**
 * Human-readable template for list tokens output
 */
export const LIST_TOKENS_TEMPLATE = `
{{#if (eq totalCount 0)}}
📝 No tokens found
{{else}}
📝 Found {{totalCount}} token(s):

{{#each tokens}}
{{add1 @index}}. {{symbol}} ({{name}})
   Token ID: {{hashscanLink tokenId "token" network}}
   Treasury: {{hashscanLink treasuryId "account" network}}
   Token Type: {{#if (eq tokenType "NonFungibleToken")}}NON FUNGIBLE TOKEN{{else}}FUNGIBLE TOKEN{{/if}}
   Supply Type: {{supplyType}}
   Decimals: {{decimals}}
   Network: {{network}}
{{#if (eq supplyType "FINITE")}}
   Max Supply: {{maxSupply}}
{{/if}}
{{#if (gt associationCount 0)}}
   Associations: {{associationCount}}
{{/if}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
{{#if keys}}
{{#if keys.adminKey}}
   Admin Key: {{keys.adminKey}}
{{/if}}
{{/if}}

{{/each}}
{{/if}}
`.trim();
