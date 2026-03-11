/**
 * Delete Batch Command Output Schema and Template
 */
import { z } from 'zod';

/**
 * Delete Batch Command Output Schema
 */
export const DeleteBatchOutputSchema = z.object({
  name: z.string().describe('Batch name'),
  order: z
    .number()
    .int()
    .optional()
    .describe('Transaction order (when deleting a single transaction)'),
});

export type DeleteBatchOutput = z.infer<typeof DeleteBatchOutputSchema>;

/**
 * Human-readable template for delete batch output
 */
export const DELETE_BATCH_TEMPLATE = `
{{#if order}}
✅ Transaction with order {{order}} removed from batch '{{name}}'
{{else}}
✅ Batch '{{name}}' deleted successfully
{{/if}}
`.trim();
