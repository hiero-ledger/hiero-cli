/**
 * Disable Plugin Command Output
 * Reuses PluginManagementRemoveOutputSchema but with disable-specific template.
 */
import type { z } from 'zod';

import { PluginManagementRemoveOutputSchema } from '@/plugins/plugin-management/schema';

// Export the schema
export { PluginManagementRemoveOutputSchema as PluginManagementDisableOutputSchema };

// Human-readable template for disable
export const PLUGIN_MANAGEMENT_DISABLE_TEMPLATE = `{{#if removed}}
✅ Plugin disabled successfully
   Name: {{name}}
{{else}}
❌ Failed to disable plugin
   Name: {{name}}
   Error: {{message}}
{{/if}}`;

// Type export
export type PluginManagementDisableOutput = z.infer<
  typeof PluginManagementRemoveOutputSchema
>;
