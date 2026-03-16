/**
 * Create Batch Command Output Schema and Template
 */
import { z } from 'zod';

/**
 * Create Batch Command Output Schema
 */
export const BatchCreateOutputSchema = z.object({
  name: z.string().describe('Batch name'),
  keyRefId: z.string().describe('Key reference ID for signing'),
});

export type BatchCreateOutput = z.infer<typeof BatchCreateOutputSchema>;

/**
 * Human-readable template for create batch output
 */
export const BATCH_CREATE_TEMPLATE = `
✅ Batch created successfully
   Name: {{name}}
   Batch Key Reference ID: {{keyRefId}}
`.trim();
