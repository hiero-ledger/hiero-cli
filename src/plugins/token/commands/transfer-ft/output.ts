/**
 * Transfer Fungible Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
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
  amount: z.string().describe('Amount transferred in base units'),
  network: NetworkSchema,
});

export type TransferFungibleTokenOutput = z.infer<
  typeof TransferFungibleTokenOutputSchema
>;

/**
 * Human-readable template for transfer fungible token output
 */
export const TRANSFER_FUNGIBLE_TOKEN_TEMPLATE = `
✅ Fungible token transfer successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   From: {{hashscanLink from "account" network}}
   To: {{hashscanLink to "account" network}}
   Amount: {{amount}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
