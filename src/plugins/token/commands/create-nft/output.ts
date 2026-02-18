/**
 * Create Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  PublicKeyDefinitionSchema,
  SupplyTypeSchema,
  TokenNameSchema,
  TokenSymbolSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Create Token Command Output Schema
 */
export const CreateNftOutputSchema = z.object({
  tokenId: EntityIdSchema.describe('Token ID'),
  name: TokenNameSchema.describe('Token name'),
  symbol: TokenSymbolSchema.describe('Token symbol'),
  treasuryId: EntityIdSchema.describe('Treasury account ID'),
  supplyType: SupplyTypeSchema.describe(
    'Supply type: INFINITE (default) or FINITE',
  ),
  transactionId: TransactionIdSchema.describe(
    'Hedera token create transaction ID',
  ),
  adminAccountId: EntityIdSchema.optional().describe('Admin account ID'),
  adminPublicKey: PublicKeyDefinitionSchema.describe('Admin public key'),
  supplyAccountId: EntityIdSchema.optional().describe('Supply account ID'),
  supplyPublicKey: PublicKeyDefinitionSchema.describe('Supply public key'),
  alias: z.string().describe('Token alias').optional(),
  network: NetworkSchema.describe('Network on which token exists'),
});

export type CreateNftOutput = z.infer<typeof CreateNftOutputSchema>;

/**
 * Human-readable template for create token output
 */
export const CREATE_NFT_TEMPLATE = `
✅ NFT created successfully: {{hashscanLink tokenId "token" network}}
   Name: {{name}} ({{symbol}})
   Treasury: {{hashscanLink treasuryId "account" network}}
   Supply Type: {{supplyType}}
{{#if adminAccountId}}
   Admin account: {{hashscanLink adminAccountId "account" network}}
{{/if}}
   Admin public key: {{adminPublicKey}}
{{#if supplyAccountId}}
   Supply account: {{hashscanLink supplyAccountId "account" network}}
{{/if}}
   Supply public key: {{supplyPublicKey}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
   Network: {{network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
