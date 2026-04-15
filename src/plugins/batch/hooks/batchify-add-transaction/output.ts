/**
 * Batchify Hook Output Schema and Template
 */
import { z } from 'zod';

/**
 * Execute Batch Command Output Schema
 */
export const BatchifyOutputSchema = z.object({
  batchName: z.string().describe('Batch name'),
  transactionOrder: z.int().describe('Transaction order'),
});

export type BatchifyOutput = z.infer<typeof BatchifyOutputSchema>;

/**
 * Human-readable template for execute batch output
 */
export const BATCHIFY_TEMPLATE = `
✅ Transaction added to batch successfully
   Batch: {{batchName}}
   Transaction order in batch: {{transactionOrder}}
`.trim();
