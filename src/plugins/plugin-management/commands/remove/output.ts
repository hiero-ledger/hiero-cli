/**
 * Remove Plugin Command Output
 * Defines output schema and template for the remove plugin command
 */
import { z } from 'zod';
import { RemovePluginOutputSchema } from '../../schema';

// Export the schema
export { RemovePluginOutputSchema };

// Human-readable template
export const REMOVE_PLUGIN_TEMPLATE = `{{#if removed}}
✅ Plugin removed successfully
   Name: {{name}}
{{else}}
❌ Failed to remove plugin
   Name: {{name}}
   Error: {{message}}
{{/if}}`;

// Type export
export type RemovePluginOutput = z.infer<typeof RemovePluginOutputSchema>;
