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
export const CreateNftOutputSchema = z.object({
  tokenId: EntityIdSchema,
  name: z.string().describe('Token name'),
  symbol: z.string().describe('Token symbol'),
  treasuryId: EntityIdSchema,
  supplyType: SupplyTypeSchema,
  transactionId: TransactionIdSchema,
  adminAccountId: EntityIdSchema,
  supplyAccountId: EntityIdSchema,
  alias: z.string().describe('Token alias').optional(),
  network: NetworkSchema,
});

export type CreateNftOutput = z.infer<typeof CreateNftOutputSchema>;

/**
 * Human-readable template for create token output
 */
export const CREATE_NFT_TEMPLATE = `
✅ NFT created successfully: {{tokenId}}
   Name: {{name}} ({{symbol}})
   Treasury: {{treasuryId}}
   Supply Type: {{supplyType}}
   Admin account: {{adminAccountId}}
   Supply account: {{supplyAccountId}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
   Network: {{network}}
   Transaction ID: {{transactionId}}
`.trim();
