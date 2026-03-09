/**
 * Execute Batch Command Output Schema and Template
 */
import { z } from 'zod';

import {
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Execute Batch Command Output Schema
 */
export const ExecuteBatchOutputSchema = z.object({
  batchName: z.string().describe('Batch name'),
  transactionId: TransactionIdSchema.describe('Transaction ID'),
  success: z.boolean().describe('Whether the transaction succeeded'),
  network: NetworkSchema.describe('Network'),
});

export type ExecuteBatchOutput = z.infer<typeof ExecuteBatchOutputSchema>;

/**
 * Human-readable template for execute batch output
 */
export const EXECUTE_BATCH_TEMPLATE = `
✅ Batch executed successfully
   Batch: {{batchName}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
   Success: {{success}}
`.trim();
