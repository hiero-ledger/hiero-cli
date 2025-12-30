/**
 * Plugin Info Command Output
 * Defines output schema and template for the plugin info command
 */
import type { z } from 'zod';

import { PluginInfoOutputSchema } from '@/plugins/plugin-management/schema';

// Export the schema
export { PluginInfoOutputSchema };

// Human-readable template
export const PLUGIN_INFO_TEMPLATE = `{{#if found}}
ℹ️  Plugin Information:
   Name: {{plugin.name}}
   Version: {{plugin.version}}
   Display Name: {{plugin.displayName}}
   Enabled: {{plugin.enabled}}
   Description: {{plugin.description}}
   Commands: {{plugin.commands}}
{{else}}
❌ {{message}}
{{/if}}`;

// Type export
export type PluginInfoOutput = z.infer<typeof PluginInfoOutputSchema>;
