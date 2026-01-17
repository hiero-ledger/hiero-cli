/**
 * Transfer Fungible Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  TokenAmountSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Transfer Fungible Token Command Output Schema
 */
export const TransferFungibleTokenOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  from: EntityIdSchema,
  to: EntityIdSchema,
  amount: TokenAmountSchema.describe('Amount transferred in base units'),
});

export type TransferFungibleTokenOutput = z.infer<
  typeof TransferFungibleTokenOutputSchema
>;

/**
 * Human-readable template for transfer fungible token output
 */
export const TRANSFER_FUNGIBLE_TOKEN_TEMPLATE = `
✅ Fungible token transfer successful!
   Fungible Token ID: {{tokenId}}
   From: {{from}}
   To: {{to}}
   Amount: {{amount}}
   Transaction ID: {{transactionId}}
`.trim();
