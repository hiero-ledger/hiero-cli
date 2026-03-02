/**
 * Reset Plugins Command Output
 * Defines output schema and template for the reset plugins command
 */
import type { z } from 'zod';

import { ResetPluginsOutputSchema } from '@/plugins/plugin-management/schema';

export { ResetPluginsOutputSchema };

export const RESET_PLUGINS_TEMPLATE = `{{#if reset}}
✅ Plugin state reset successfully
{{else}}
❌ Failed to reset plugin state
   Error: {{message}}
{{/if}}`;

export type ResetPluginsOutput = z.infer<typeof ResetPluginsOutputSchema>;
