/**
 * Transfer Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TokenAmountSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Transfer Token Command Output Schema
 */
export const TransferTokenOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  from: EntityIdSchema,
  to: EntityIdSchema,
  amount: TokenAmountSchema.describe('Amount transferred in base units'),
  network: NetworkSchema,
});

export type TransferTokenOutput = z.infer<typeof TransferTokenOutputSchema>;

/**
 * Human-readable template for transfer token output
 */
export const TRANSFER_TOKEN_TEMPLATE = `
✅ Token transfer successful!
   Token ID: {{hashscanLink tokenId "token" network}}
   From: {{hashscanLink from "account" network}}
   To: {{hashscanLink to "account" network}}
   Amount: {{amount}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
