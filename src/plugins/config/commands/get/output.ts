/**
 * Get Config Option Output Schema and Template
 */
import { z } from 'zod';

import {
  ConfigOptionTypeSchema,
  ConfigValueSchema,
} from '@/plugins/config/schema';

export const ConfigGetOutputSchema = z.object({
  name: z.string(),
  type: ConfigOptionTypeSchema,
  value: ConfigValueSchema,
  allowedValues: z.array(z.string()).optional(),
});

export type ConfigGetOutput = z.infer<typeof ConfigGetOutputSchema>;

export const CONFIG_GET_TEMPLATE = `
🔧 {{name}}
   Type: {{type}}
   Value: {{value}}{{#if allowedValues}} [{{#each allowedValues}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}]{{/if}}
`.trim();
