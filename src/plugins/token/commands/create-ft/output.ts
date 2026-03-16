/**
 * Create Fungible Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  SupplyTypeSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Create Fungible Token Command Output Schema
 */
export const TokenCreateFtOutputSchema = z.object({
  tokenId: EntityIdSchema,
  name: z.string().describe('Fungible token name'),
  symbol: z.string().describe('Fungible token symbol'),
  treasuryId: EntityIdSchema,
  decimals: z.int().min(0).max(8).describe('Number of decimal places'),
  initialSupply: z.string().describe('Initial supply in base units'),
  supplyType: SupplyTypeSchema,
  transactionId: TransactionIdSchema,
  alias: z.string().describe('Fungible token alias').optional(),
  network: NetworkSchema,
});

export type TokenCreateFtOutput = z.infer<typeof TokenCreateFtOutputSchema>;

/**
 * Human-readable template for create fungible token output
 */
export const TOKEN_CREATE_FT_TEMPLATE = `
✅ Fungible token created successfully: {{hashscanLink tokenId "token" network}}
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
`.trim();
