/**
 * Transfer Fungible Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TokenAmountSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Transfer Fungible Token Command Output Schema
 */
export const TokenTransferFtOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  from: EntityIdSchema,
  to: EntityIdSchema,
  amount: TokenAmountSchema.describe('Amount transferred in base units'),
  network: NetworkSchema,
});

export type TokenTransferFtOutput = z.infer<typeof TokenTransferFtOutputSchema>;

/**
 * Human-readable template for transfer fungible token output
 */
export const TOKEN_TRANSFER_FT_TEMPLATE = `
✅ Fungible token transfer successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   From: {{hashscanLink from "account" network}}
   To: {{hashscanLink to "account" network}}
   Amount: {{amount}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
