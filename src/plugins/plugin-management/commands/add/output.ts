/**
 * Add Plugin Command Output
 * Defines output schema and template for the add plugin command
 */
import type { z } from 'zod';

import { PluginManagementAddOutputSchema } from '@/plugins/plugin-management/schema';

// Export the schema
export { PluginManagementAddOutputSchema };

// Human-readable template
export const PLUGIN_MANAGEMENT_ADD_TEMPLATE = `{{#if added}}
✅ Plugin added successfully
   Name: {{name}}
   Path: {{path}}
{{else}}
❌ Failed to add plugin
   Name: {{name}}
   Path: {{path}}
   Error: {{message}}
{{/if}}`;

// Type export
export type PluginManagementAddOutput = z.infer<
  typeof PluginManagementAddOutputSchema
>;
