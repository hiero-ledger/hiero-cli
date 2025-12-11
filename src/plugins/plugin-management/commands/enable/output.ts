/**
 * Enable Plugin Command Output
 * Defines output schema and template for the enable plugin command
 */
import { z } from 'zod';
import { EnablePluginOutputSchema } from '../../schema';

// Export the schema
export { EnablePluginOutputSchema };

// Human-readable template for enable
export const ENABLE_PLUGIN_TEMPLATE = `{{#if enabled}}
✅ Plugin enabled successfully
   Name: {{name}}
{{else}}
❌ Failed to enable plugin
   Name: {{name}}
   Error: {{message}}
{{/if}}`;

// Type export
export type EnablePluginOutput = z.infer<typeof EnablePluginOutputSchema>;
