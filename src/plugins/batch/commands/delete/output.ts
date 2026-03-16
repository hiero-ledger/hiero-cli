/**
 * Delete Batch Command Output Schema and Template
 */
import { z } from 'zod';

/**
 * Delete Batch Command Output Schema
 */
export const BatchDeleteOutputSchema = z.object({
  name: z.string().describe('Batch name'),
  order: z
    .number()
    .int()
    .optional()
    .describe('Transaction order (when deleting a single transaction)'),
});

export type BatchDeleteOutput = z.infer<typeof BatchDeleteOutputSchema>;

/**
 * Human-readable template for delete batch output
 */
export const BATCH_DELETE_TEMPLATE = `
{{#if order}}
✅ Transaction with order {{order}} removed from batch '{{name}}'
{{else}}
✅ Batch '{{name}}' deleted successfully
{{/if}}
`.trim();
