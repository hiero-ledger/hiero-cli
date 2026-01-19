/**
 * Create Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
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
  adminAccountId: EntityIdSchema.describe('Admin account ID'),
  supplyAccountId: EntityIdSchema.describe('Supply account ID'),
  alias: z.string().describe('Token alias').optional(),
  network: NetworkSchema.describe('Network on which token exists'),
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
