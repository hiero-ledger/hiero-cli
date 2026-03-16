/**
 * Set Config Option Output Schema and Template
 */
import { z } from 'zod';

import {
  ConfigOptionTypeSchema,
  ConfigValueSchema,
} from '@/plugins/config/schema';

export const ConfigSetOutputSchema = z.object({
  name: z.string(),
  type: ConfigOptionTypeSchema,
  previousValue: ConfigValueSchema.optional(),
  newValue: ConfigValueSchema,
});

export type ConfigSetOutput = z.infer<typeof ConfigSetOutputSchema>;

export const CONFIG_SET_TEMPLATE = `
✅ Updated configuration option
   {{name}}
   Type: {{type}}
   Previous: {{previousValue}}
   New: {{newValue}}
`.trim();
