import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  SupplyTypeSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

const TokenAssociationResultSchema = z.object({
  accountId: EntityIdSchema,
  name: z.string().describe('Account name or alias'),
  success: z.boolean().describe('Whether the association was successful'),
  transactionId: TransactionIdSchema.optional(),
});

export const CreateNftFromFileOutputSchema = z.object({
  tokenId: EntityIdSchema,
  name: z.string().describe('NFT token name'),
  symbol: z.string().describe('NFT token symbol'),
  treasuryId: EntityIdSchema,
  adminAccountId: EntityIdSchema,
  supplyAccountId: EntityIdSchema,
  supplyType: SupplyTypeSchema,
  transactionId: TransactionIdSchema,
  alias: z.string().describe('NFT token alias').optional(),
  network: NetworkSchema,
  associations: z
    .array(TokenAssociationResultSchema)
    .describe('NFT token associations created'),
});

export type CreateNftFromFileOutput = z.infer<
  typeof CreateNftFromFileOutputSchema
>;

export const CREATE_NFT_FROM_FILE_TEMPLATE = `
✅ NFT token created from file successfully: {{hashscanLink tokenId "token" network}}

   Name: {{name}} ({{symbol}})
   Treasury: {{hashscanLink treasuryId "account" network}}
   Admin: {{hashscanLink adminAccountId "account" network}}
   Supply: {{hashscanLink supplyAccountId "account" network}}
   Supply Type: {{supplyType}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
   Network: {{network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
{{#if associations.length}}
🔗 NFT Token Associations ({{associations.length}}):
{{#each associations}}
   {{add1 @index}}. {{name}} ({{hashscanLink accountId "account" ../network}}) - {{#if success}}✅ Success{{else}}❌ Failed{{/if}}{{#if transactionId}} - {{hashscanLink transactionId "transaction" ../network}}{{/if}}
{{/each}}
{{/if}}
`.trim();
