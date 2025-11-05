/**
 * State Info Command Output Schema and Template
 */
import { z } from 'zod';
import { NamespaceInfoSchema } from '../../schema';

/**
 * State Info Command Output Schema
 */
export const StateInfoOutputSchema = z.object({
  storageDirectory: z.string().describe('Path to the storage directory'),
  isInitialized: z
    .boolean()
    .describe('Whether the storage directory is initialized'),
  totalEntries: z.number().describe('Total number of entries'),
  totalSize: z.number().describe('Total size in bytes'),
  namespaces: z
    .array(NamespaceInfoSchema)
    .describe('Information about each namespace'),
});

export type StateInfoOutput = z.infer<typeof StateInfoOutputSchema>;

/**
 * Human-readable template for state info output
 */
export const STATE_INFO_TEMPLATE = `
ℹ️  State Information:

   Storage Directory: {{storageDirectory}}
   Status: {{#if isInitialized}}Active{{else}}Not initialized{{/if}}
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
