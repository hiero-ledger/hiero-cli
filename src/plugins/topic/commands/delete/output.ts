/**
 * Delete Topic Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

/**
 * Delete Topic Command Output Schema
 */
export const DeleteTopicOutputSchema = z.object({
  deletedTopic: z.object({
    name: z.string().describe('Topic name or alias').optional(),
    topicId: EntityIdSchema,
  }),
  removedAliases: z.array(z.string().describe('Removed alias')).optional(),
  network: NetworkSchema,
});

export type DeleteTopicOutput = z.infer<typeof DeleteTopicOutputSchema>;

/**
 * Human-readable template for delete topic output
 */
export const DELETE_TOPIC_TEMPLATE = `
✅ Topic deleted successfully: {{#if deletedTopic.name}}{{deletedTopic.name}}{{/if}} ({{hashscanLink deletedTopic.topicId "topic" network}})
{{#if removedAliases}}
🧹 Removed {{removedAliases.length}} alias(es):
{{#each removedAliases}}
   - {{this}}
{{/each}}
{{/if}}
`.trim();
