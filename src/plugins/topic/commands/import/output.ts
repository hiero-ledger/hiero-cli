/**
 * Import Topic Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

/**
 * Import Topic Command Output Schema
 */
export const TopicImportOutputSchema = z.object({
  topicId: EntityIdSchema,
  name: z.string().describe('Topic name').optional(),
  network: NetworkSchema,
  memo: z.string().describe('Topic memo').optional(),
  adminKeyPresent: z
    .boolean()
    .describe('Whether admin key is set on the topic'),
  submitKeyPresent: z
    .boolean()
    .describe('Whether submit key is set on the topic'),
  adminKeysMatched: z
    .number()
    .int()
    .min(0)
    .describe('Number of admin keys matched with KMS'),
  submitKeysMatched: z
    .number()
    .int()
    .min(0)
    .describe('Number of submit keys matched with KMS'),
});

export type TopicImportOutput = z.infer<typeof TopicImportOutputSchema>;

/**
 * Human-readable template for import topic output
 */
export const TOPIC_IMPORT_TEMPLATE = `
✅ Topic imported successfully: {{hashscanLink topicId "topic" network}}
   Network: {{network}}
{{#if name}}
   Name: {{name}}
{{/if}}
{{#if memo}}
   Memo: {{memo}}
{{/if}}
   Admin key: {{#if adminKeyPresent}}✅ Present{{#if adminKeysMatched}} ({{adminKeysMatched}} matched in KMS){{/if}}{{else}}❌ Not set{{/if}}
   Submit key: {{#if submitKeyPresent}}✅ Present{{#if submitKeysMatched}} ({{submitKeysMatched}} matched in KMS){{/if}}{{else}}❌ Not set (public topic){{/if}}

`.trim();
