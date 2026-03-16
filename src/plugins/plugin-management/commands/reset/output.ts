/**
 * Reset Plugins Command Output
 * Defines output schema and template for the reset plugins command
 */
import type { z } from 'zod';

import { PluginManagementResetOutputSchema } from '@/plugins/plugin-management/schema';

export { PluginManagementResetOutputSchema };

export const PLUGIN_MANAGEMENT_RESET_TEMPLATE = `{{#if reset}}
✅ Plugin state reset successfully
{{else}}
❌ Failed to reset plugin state
   Error: {{message}}
{{/if}}`;

export type PluginManagementResetOutput = z.infer<
  typeof PluginManagementResetOutputSchema
>;
