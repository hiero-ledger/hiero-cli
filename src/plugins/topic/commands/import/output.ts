/**
 * Import Topic Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

/**
 * Import Topic Command Output Schema
 */
export const ImportTopicOutputSchema = z.object({
  topicId: EntityIdSchema,
  name: z.string().describe('Topic name or alias'),
  network: NetworkSchema,
  memo: z.string().describe('Topic memo').optional(),
  adminKeyPresent: z
    .boolean()
    .describe('Whether admin key is set on the topic'),
  submitKeyPresent: z
    .boolean()
    .describe('Whether submit key is set on the topic'),
  alias: z.string().describe('Topic alias').optional(),
});

export type ImportTopicOutput = z.infer<typeof ImportTopicOutputSchema>;

/**
 * Human-readable template for import topic output
 */
export const IMPORT_TOPIC_TEMPLATE = `
✅ Topic imported successfully: {{hashscanLink topicId "topic" network}}
   Network: {{network}}
   Name (Alias): {{name}}
{{#if memo}}
   Memo: {{memo}}
{{/if}}
   Admin key: {{#if adminKeyPresent}}✅ Present{{else}}❌ Not set{{/if}}
   Submit key: {{#if submitKeyPresent}}✅ Present{{else}}❌ Not set (public topic){{/if}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
`.trim();
