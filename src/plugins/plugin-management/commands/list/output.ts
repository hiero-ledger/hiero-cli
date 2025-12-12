/**
 * List Plugins Command Output
 * Defines output schema and template for the list plugins command
 */
import type { z } from 'zod';

import { ListPluginsOutputSchema } from '@/plugins/plugin-management/schema';

// Export the schema
export { ListPluginsOutputSchema };

// Human-readable template
export const LIST_PLUGINS_TEMPLATE = `📋 Available Plugins ({{count}}):

{{#each plugins}}
{{add1 @index}}.
   Name: {{name}}
   Enabled: {{enabled}}
{{/each}}

Use "plugin-management info <name>" for detailed information`;

// Type export
export type ListPluginsOutput = z.infer<typeof ListPluginsOutputSchema>;
