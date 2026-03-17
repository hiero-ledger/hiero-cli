/**
 * Remove Plugin Command Output
 * Defines output schema and template for the remove plugin command
 */
import type { z } from 'zod';

import { PluginManagementRemoveOutputSchema } from '@/plugins/plugin-management/schema';

// Export the schema
export { PluginManagementRemoveOutputSchema };

// Human-readable template
export const PLUGIN_MANAGEMENT_REMOVE_TEMPLATE = `{{#if removed}}
✅ Plugin removed successfully
   Name: {{name}}
{{else}}
❌ Failed to remove plugin
   Name: {{name}}
   Error: {{message}}
{{/if}}`;

// Type export
export type PluginManagementRemoveOutput = z.infer<
  typeof PluginManagementRemoveOutputSchema
>;
