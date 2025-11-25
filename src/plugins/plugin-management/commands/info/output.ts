/**
 * Plugin Info Command Output
 * Defines output schema and template for the plugin info command
 */
import { z } from 'zod';
import { PluginInfoOutputSchema } from '../../schema';

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
   Capabilities: {{plugin.capabilities}}
{{else}}
❌ Plugin '{{name}}' not found
   {{message}}
{{/if}}`;

// Type export
export type PluginInfoOutput = z.infer<typeof PluginInfoOutputSchema>;
