/**
 * Add Plugin Command Output
 * Defines output schema and template for the add plugin command
 */
import type { z } from 'zod';

import { AddPluginOutputSchema } from '@/plugins/plugin-management/schema';

// Export the schema
export { AddPluginOutputSchema };

// Human-readable template
export const ADD_PLUGIN_TEMPLATE = `{{#if added}}
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
export type AddPluginOutput = z.infer<typeof AddPluginOutputSchema>;
