/**
 * Create Fungible Token From File Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  SupplyTypeSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Fungible Token Association Result Schema
 */
const TokenAssociationResultSchema = z.object({
  accountId: EntityIdSchema,
  name: z.string().describe('Account name or alias'),
  success: z.boolean().describe('Whether the association was successful'),
  transactionId: TransactionIdSchema.optional(),
});

/**
 * Create Fungible Token From File Command Output Schema
 */
export const CreateFungibleTokenFromFileOutputSchema = z.object({
  tokenId: EntityIdSchema,
  name: z.string().describe('Fungible token name'),
  symbol: z.string().describe('Fungible token symbol'),
  treasuryId: EntityIdSchema,
  decimals: z.number().int().min(0).max(8).describe('Number of decimal places'),
  initialSupply: z.string().describe('Initial supply in base units'),
  supplyType: SupplyTypeSchema,
  transactionId: TransactionIdSchema,
  alias: z.string().describe('Fungible token alias').optional(),
  network: NetworkSchema,
  associations: z
    .array(TokenAssociationResultSchema)
    .describe('Fungible token associations created'),
});

export type CreateFungibleTokenFromFileOutput = z.infer<
  typeof CreateFungibleTokenFromFileOutputSchema
>;

/**
 * Human-readable template for create fungible token from file output
 */
export const CREATE_FUNGIBLE_TOKEN_FROM_FILE_TEMPLATE = `
✅ Fungible token created from file successfully: {{hashscanLink tokenId "token" network}}
   Name: {{name}} ({{symbol}})
   Treasury: {{hashscanLink treasuryId "account" network}}
   Decimals: {{decimals}}
   Initial Supply: {{initialSupply}}
   Supply Type: {{supplyType}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
   Network: {{network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}

{{#if associations.length}}
🔗 Fungible Token Associations ({{associations.length}}):
{{#each associations}}
   {{add1 @index}}. {{name}} ({{hashscanLink accountId "account" ../network}}) - {{#if success}}✅ Success{{else}}❌ Failed{{/if}}{{#if transactionId}} - {{hashscanLink transactionId "transaction" ../network}}{{/if}}
{{/each}}
{{/if}}
`.trim();
