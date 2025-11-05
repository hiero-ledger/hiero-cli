/**
 * Clear State Command Output Schema and Template
 */
import { z } from 'zod';

/**
 * Clear State Command Output Schema
 */
export const ClearStateOutputSchema = z.object({
  cleared: z.boolean().describe('Whether the clear operation was successful'),
  namespace: z
    .string()
    .optional()
    .describe('Namespace that was cleared (if specific)'),
  entriesCleared: z.number().describe('Number of entries that were cleared'),
  totalNamespaces: z
    .number()
    .optional()
    .describe('Total namespaces affected (if clearing all)'),
  message: z.string().describe('Human-readable message about the operation'),
});

export type ClearStateOutput = z.infer<typeof ClearStateOutputSchema>;

/**
 * Human-readable template for clear state output
 */
export const CLEAR_STATE_TEMPLATE = `
{{#if cleared}}
✅ {{message}}
{{#if namespace}}
   Namespace: {{namespace}}
{{/if}}
   Entries cleared: {{entriesCleared}}
{{#if totalNamespaces}}
   Total namespaces affected: {{totalNamespaces}}
{{/if}}
{{else}}
❌ {{message}}
{{/if}}
`.trim();
