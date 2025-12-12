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
  decimals: z.number().int().min(0).max(8).describe('Number of decimal places'),
  supplyType: SupplyTypeSchema,
  treasuryId: EntityIdSchema,
  network: NetworkSchema,
  keys: TokenKeysSchema.optional(),
  alias: z.string().describe('Token alias').optional(),
});

/**
 * Token Statistics Schema
 */
const TokenStatisticsSchema = z.object({
  total: z.number().int().nonnegative().describe('Total number of tokens'),
  withKeys: z
    .number()
    .int()
    .nonnegative()
    .describe('Tokens with management keys'),
  byNetwork: z
    .record(z.string(), z.number().int().nonnegative())
    .describe('Token count by network'),
  bySupplyType: z
    .record(z.string(), z.number().int().nonnegative())
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
  count: z.number().int().nonnegative().describe('Number of tokens returned'),
  network: NetworkSchema.optional(),
  stats: TokenStatisticsSchema.optional(),
});

export type ListTokensOutput = z.infer<typeof ListTokensOutputSchema>;

/**
 * Human-readable template for list tokens output
 */
export const LIST_TOKENS_TEMPLATE = `
{{#if tokens.length}}
📄 Found {{count}} token(s){{#if network}} on {{network}}{{/if}}:

{{#each tokens}}
{{add1 @index}}. {{symbol}} ({{name}})
   Token ID: {{tokenId}}
   Treasury: {{treasuryId}}
   Supply Type: {{supplyType}}
   Decimals: {{decimals}}
   Network: {{network}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
{{#if keys}}
   Keys Available: {{#if keys.adminKey}}Admin {{/if}}{{#if keys.supplyKey}}Supply {{/if}}{{#if keys.wipeKey}}Wipe {{/if}}{{#if keys.kycKey}}KYC {{/if}}{{#if keys.freezeKey}}Freeze {{/if}}{{#if keys.pauseKey}}Pause {{/if}}{{#if keys.feeScheduleKey}}FeeSchedule {{/if}}{{#if keys.treasuryKey}}Treasury{{/if}}
{{/if}}

{{/each}}
{{#if stats}}
📊 Statistics:
   Total: {{stats.total}}
   With Keys: {{stats.withKeys}}
   With Associations: {{stats.withAssociations}}
   Total Associations: {{stats.totalAssociations}}
{{/if}}
{{else}}
📄 No tokens found{{#if network}} on {{network}}{{/if}}.
{{/if}}
`.trim();
