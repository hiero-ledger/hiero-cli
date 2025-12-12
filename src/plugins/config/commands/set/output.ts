/**
 * Set Config Option Output Schema and Template
 */
import { z } from 'zod';

import {
  ConfigOptionTypeSchema,
  ConfigValueSchema,
} from '@/plugins/config/schema';

export const SetConfigOutputSchema = z.object({
  name: z.string(),
  type: ConfigOptionTypeSchema,
  previousValue: ConfigValueSchema.optional(),
  newValue: ConfigValueSchema,
});

export type SetConfigOutput = z.infer<typeof SetConfigOutputSchema>;

export const SET_CONFIG_TEMPLATE = `
✅ Updated configuration option
   {{name}}
   Type: {{type}}
   Previous: {{previousValue}}
   New: {{newValue}}
`.trim();
