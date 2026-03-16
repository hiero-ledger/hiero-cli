/**
 * Find Messages Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema, TimestampSchema } from '@/core/schemas';

export const TopicFindMessageItemOutputSchema = z.object({
  sequenceNumber: z
    .number()
    .int()
    .positive()
    .describe('Message sequence number'),
  message: z.string().describe('Decoded message content'),
  timestamp: z.string().describe('Human-readable timestamp'),
  consensusTimestamp: TimestampSchema.describe('Hedera consensus timestamp'),
});

export type TopicFindMessageItemOutput = z.infer<
  typeof TopicFindMessageItemOutputSchema
>;
/**
 * Find Messages Command Output Schema
 * Defines the structure of message query results with unified array format
 */
export const TopicFindMessageOutputSchema = z.object({
  topicId: EntityIdSchema,
  messages: z
    .array(TopicFindMessageItemOutputSchema)
    .describe('Messages found'),
  totalCount: z.number().describe('Total number of messages found'),
  network: NetworkSchema,
});

// Infer TypeScript type from schema for type safety
export type TopicFindMessageOutput = z.infer<
  typeof TopicFindMessageOutputSchema
>;

/**
 * Human-readable Handlebars template for find messages output
 * Handles both single and multiple message results uniformly
 */
export const TOPIC_FIND_MESSAGE_TEMPLATE = `
{{#if (eq totalCount 0)}}
No messages found in topic {{hashscanLink topicId "topic" network}}
{{else}}
Found {{totalCount}} message(s) in topic {{hashscanLink topicId "topic" network}}
──────────────────────────────────────
{{#each messages}}
{{add1 @index}}. Sequence #{{sequenceNumber}}
   Message: "{{{message}}}"
   Timestamp: {{timestamp}}
{{#unless @last}}

{{/unless}}
{{/each}}
──────────────────────────────────────
{{/if}}
`.trim();
