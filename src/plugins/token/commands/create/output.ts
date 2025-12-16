/**
 * Create Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  SupplyTypeSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Create Token Command Output Schema
 */
export const CreateTokenOutputSchema = z.object({
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
});

export type CreateTokenOutput = z.infer<typeof CreateTokenOutputSchema>;

/**
 * Human-readable template for create token output
 */
export const CREATE_TOKEN_TEMPLATE = `
✅ Token created successfully: {{tokenId}}
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
`.trim();
