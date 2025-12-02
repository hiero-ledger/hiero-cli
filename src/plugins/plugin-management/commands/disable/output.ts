/**
 * Disable Plugin Command Output
 * Reuses RemovePluginOutputSchema but with disable-specific template.
 */
import { z } from 'zod';
import { RemovePluginOutputSchema } from '../../schema';

// Export the schema
export { RemovePluginOutputSchema as DisablePluginOutputSchema };

// Human-readable template for disable
export const DISABLE_PLUGIN_TEMPLATE = `{{#if removed}}
✅ Plugin disabled successfully
   Name: {{name}}
{{else}}
❌ Failed to disable plugin
   Name: {{name}}
   Error: {{message}}
{{/if}}`;

// Type export
export type DisablePluginOutput = z.infer<typeof RemovePluginOutputSchema>;
