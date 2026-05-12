/**
 * Enable Plugin Command Output
 * Defines output schema and template for the enable plugin command
 */
import type { z } from 'zod';

import { PluginManagementEnableOutputSchema } from '@/plugins/plugin-management/schema';

// Export the schema
export { PluginManagementEnableOutputSchema };

// Human-readable template for enable
export const PLUGIN_MANAGEMENT_ENABLE_TEMPLATE = `{{#if enabled}}
✅ Plugin enabled successfully
   Name: {{name}}
{{else}}
❌ Failed to enable plugin
   Name: {{name}}
   Error: {{message}}
{{/if}}`;

// Type export
export type PluginManagementEnableOutput = z.infer<
  typeof PluginManagementEnableOutputSchema
>;
