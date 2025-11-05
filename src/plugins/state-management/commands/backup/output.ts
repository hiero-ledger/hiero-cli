/**
 * State Backup Command Output Schema and Template
 */
import { z } from 'zod';

/**
 * State Backup Command Output Schema
 */
export const StateBackupOutputSchema = z.object({
  success: z.boolean().describe('Whether the backup was successful'),
  filePath: z.string().describe('Path to the created backup file'),
  timestamp: z.string().describe('ISO timestamp when backup was created'),
  totalNamespaces: z
    .number()
    .describe('Number of namespaces included in backup'),
  totalSize: z.number().describe('Total size of backup data in bytes'),
  namespaces: z
    .array(z.string())
    .describe('List of namespaces included in backup'),
});

export type StateBackupOutput = z.infer<typeof StateBackupOutputSchema>;

/**
 * Human-readable template for state backup output
 */
export const STATE_BACKUP_TEMPLATE = `
{{#if success}}
✅ Backup created successfully: {{filePath}}
   Timestamp: {{timestamp}}
   Namespaces: {{totalNamespaces}}
   Total size: {{totalSize}} bytes
   Included namespaces: {{#each namespaces}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{else}}
❌ Backup failed
{{/if}}
`.trim();
