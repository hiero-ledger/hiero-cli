/**
 * List Batches Command Output Schema and Template
 */
import { z } from 'zod';

import { PublicKeyDefinitionSchema } from '@/core/schemas/common-schemas';

/**
 * List Batches Command Output Schema
 */
export const ListBatchesOutputSchema = z.object({
  batches: z.array(
    z.object({
      name: z.string().describe('Batch name'),
      batchKey: PublicKeyDefinitionSchema.describe('Batch key').optional(),
      transactionCount: z.int().describe('Inner transaction count'),
      executed: z.boolean().describe('Batch executed'),
      success: z.boolean().describe('Batch executed successfully'),
    }),
  ),
  totalCount: z.number().describe('Total number of batches'),
});

export type ListBatchesOutput = z.infer<typeof ListBatchesOutputSchema>;

/**
 * Human-readable template for list batches output
 */
export const LIST_BATCHES_TEMPLATE = `
{{#if (eq totalCount 0)}}
📝 No batches found
{{else}}
📝 Found {{totalCount}} batch(es):

{{#each batches}}
{{add1 @index}}. Name: {{name}}
{{#if batchKey}}
   Batch key: {{batchKey}}
{{/if}}
   Total transaction: {{transactionCount}}
{{#if executed}}
   Batch has been executed with status {{#if success}}success{{else}}failure{{/if}}
{{else}}
   Batch has not been executed
{{/if}}

{{/each}}
{{/if}}
`.trim();
