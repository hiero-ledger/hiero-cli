/**
 * List Plugins Command Output
 * Defines output schema and template for the list plugins command
 */
import type { z } from 'zod';

import { PluginManagementListOutputSchema } from '@/plugins/plugin-management/schema';

// Export the schema
export { PluginManagementListOutputSchema };

// Human-readable template
export const PLUGIN_MANAGEMENT_LIST_TEMPLATE = `📋 Available Plugins ({{count}}):

{{#each plugins}}
{{add1 @index}}.
   Name: {{name}}
   Enabled: {{enabled}}
{{/each}}

Use "plugin-management info <name>" for detailed information`;

// Type export
export type PluginManagementListOutput = z.infer<
  typeof PluginManagementListOutputSchema
>;
