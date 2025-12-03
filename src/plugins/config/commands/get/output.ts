/**
 * Get Config Option Output Schema and Template
 */
import { ConfigOptionTypeSchema, ConfigValueSchema } from '../../schema';
import { z } from 'zod';

export const GetConfigOutputSchema = z.object({
  name: z.string(),
  type: ConfigOptionTypeSchema,
  value: ConfigValueSchema,
  allowedValues: z.array(z.string()).optional(),
});

export type GetConfigOutput = z.infer<typeof GetConfigOutputSchema>;

export const GET_CONFIG_TEMPLATE = `
🔧 {{name}}
   Type: {{type}}
   Value: {{value}}{{#if allowedValues}} [{{#each allowedValues}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}]{{/if}}
`.trim();
