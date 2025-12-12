/**
 * Create Token From File Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  SupplyTypeSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Token Association Result Schema
 */
const TokenAssociationResultSchema = z.object({
  accountId: EntityIdSchema,
  name: z.string().describe('Account name or alias'),
  success: z.boolean().describe('Whether the association was successful'),
  transactionId: TransactionIdSchema.optional(),
});

/**
 * Create Token From File Command Output Schema
 */
export const CreateTokenFromFileOutputSchema = z.object({
  tokenId: EntityIdSchema,
  name: z.string().describe('Token name'),
  symbol: z.string().describe('Token symbol'),
  treasuryId: EntityIdSchema,
  decimals: z.number().int().min(0).max(8).describe('Number of decimal places'),
  initialSupply: z.string().describe('Initial supply in base units'),
  supplyType: SupplyTypeSchema,
  transactionId: TransactionIdSchema,
  alias: z.string().describe('Token alias').optional(),
  network: NetworkSchema,
  associations: z
    .array(TokenAssociationResultSchema)
    .describe('Token associations created'),
});

export type CreateTokenFromFileOutput = z.infer<
  typeof CreateTokenFromFileOutputSchema
>;

/**
 * Human-readable template for create token from file output
 */
export const CREATE_TOKEN_FROM_FILE_TEMPLATE = `
✅ Token created from file successfully: {{tokenId}}
   Name: {{name}} ({{symbol}})
   Treasury: {{treasuryId}}
   Decimals: {{decimals}}
   Initial Supply: {{initialSupply}}
   Supply Type: {{supplyType}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
   Network: {{network}}
   Transaction ID: {{transactionId}}

{{#if associations.length}}
🔗 Token Associations ({{associations.length}}):
{{#each associations}}
   {{add1 @index}}. {{name}} ({{accountId}}) - {{#if success}}✅ Success{{else}}❌ Failed{{/if}}{{#if transactionId}} - {{transactionId}}{{/if}}
{{/each}}
{{/if}}
`.trim();
