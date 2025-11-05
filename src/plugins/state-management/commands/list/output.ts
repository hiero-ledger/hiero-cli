/**
 * List State Command Output Schema and Template
 */
import { z } from 'zod';
import { NamespaceInfoSchema } from '../../schema';

/**
 * List State Command Output Schema
 */
export const ListStateOutputSchema = z.object({
  namespaces: z
    .array(NamespaceInfoSchema)
    .describe('List of namespaces with their information'),
  totalNamespaces: z.number().describe('Total number of namespaces'),
  totalEntries: z
    .number()
    .describe('Total number of entries across all namespaces'),
  totalSize: z.number().describe('Total size in bytes across all namespaces'),
  filteredNamespace: z
    .string()
    .optional()
    .describe('Namespace that was filtered (if --namespace was used)'),
});

export type ListStateOutput = z.infer<typeof ListStateOutputSchema>;

/**
 * Human-readable template for list state output
 */
export const LIST_STATE_TEMPLATE = `
{{#if (eq totalNamespaces 0)}}
📝 No state data found
{{else}}
{{#if filteredNamespace}}
📝 State data for namespace: {{filteredNamespace}}
{{else}}
📝 State data across all namespaces
{{/if}}

{{#each namespaces}}
{{add1 @index}}. {{name}}
   Entries: {{entryCount}}
   Size: {{size}} bytes
   Last Modified: {{lastModified}}

{{/each}}
Total: {{totalEntries}} entries, {{totalSize}} bytes across {{totalNamespaces}} namespace(s)
{{/if}}
`.trim();
