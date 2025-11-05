/**
 * State Stats Command Output Schema and Template
 */
import { z } from 'zod';
import { NamespaceInfoSchema } from '../../schema';

/**
 * State Stats Command Output Schema
 */
export const StateStatsOutputSchema = z.object({
  totalNamespaces: z.number().describe('Total number of namespaces'),
  totalEntries: z
    .number()
    .describe('Total number of entries across all namespaces'),
  totalSize: z.number().describe('Total size in bytes across all namespaces'),
  namespaces: z
    .array(NamespaceInfoSchema)
    .describe('Detailed information about each namespace'),
});

export type StateStatsOutput = z.infer<typeof StateStatsOutputSchema>;

/**
 * Human-readable template for state stats output
 */
export const STATE_STATS_TEMPLATE = `
📊 State Statistics:

   Total Namespaces: {{totalNamespaces}}
   Total Entries: {{totalEntries}}
   Total Size: {{totalSize}} bytes

{{#if (gt namespaces.length 0)}}
   Namespace Details:
{{#each namespaces}}
   {{name}}:
     Entries: {{entryCount}}
     Size: {{size}} bytes
     Last Modified: {{lastModified}}

{{/each}}
{{else}}
   No namespaces found
{{/if}}
`.trim();
