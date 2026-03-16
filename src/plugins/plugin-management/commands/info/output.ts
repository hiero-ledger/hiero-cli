/**
 * Plugin Info Command Output
 * Defines output schema and template for the plugin info command
 */
import type { z } from 'zod';

import { PluginManagementInfoOutputSchema } from '@/plugins/plugin-management/schema';

// Export the schema
export { PluginManagementInfoOutputSchema };

// Human-readable template
export const PLUGIN_MANAGEMENT_INFO_TEMPLATE = `{{#if found}}
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
export type PluginManagementInfoOutput = z.infer<
  typeof PluginManagementInfoOutputSchema
>;
