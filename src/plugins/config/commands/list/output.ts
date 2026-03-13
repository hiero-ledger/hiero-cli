/**
 * List Config Options Output Schema and Template
 */
import { z } from 'zod';

import {
  ConfigOptionTypeSchema,
  ConfigValueSchema,
} from '@/plugins/config/schema';

export const ConfigListOutputSchema = z.object({
  options: z.array(
    z.object({
      name: z.string(),
      type: ConfigOptionTypeSchema,
      value: ConfigValueSchema,
      allowedValues: z.array(z.string()).optional(),
    }),
  ),
  totalCount: z.number(),
});

export type ListConfigOutput = z.infer<typeof ConfigListOutputSchema>;

export const CONFIG_LIST_TEMPLATE = `
{{#if (eq totalCount 0)}}
📝 No configuration options available
{{else}}
📝 Found {{totalCount}} configuration option(s):

{{#each options}}
{{add1 @index}}. {{name}}
   Type: {{type}}
   Value: {{value}}{{#if allowedValues}} [{{#each allowedValues}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}]{{/if}}

{{/each}}
{{/if}}
`.trim();
