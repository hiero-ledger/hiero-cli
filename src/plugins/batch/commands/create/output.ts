/**
 * Create Batch Command Output Schema and Template
 */
import { z } from 'zod';

/**
 * Create Batch Command Output Schema
 */
export const CreateBatchOutputSchema = z.object({
  name: z.string().describe('Batch name'),
  keyRefId: z.string().describe('Key reference ID for signing'),
});

export type CreateBatchOutput = z.infer<typeof CreateBatchOutputSchema>;

/**
 * Human-readable template for create batch output
 */
export const CREATE_BATCH_TEMPLATE = `
✅ Batch created successfully
   Name: {{name}}
   Batch Key Reference ID: {{keyRefId}}
`.trim();
