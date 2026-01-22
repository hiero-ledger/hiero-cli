/**
 * Find Messages Command Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema, TimestampSchema } from '@/core/schemas';

export const FindMessageOutputSchema = z.object({
  sequenceNumber: z
    .number()
    .int()
    .positive()
    .describe('Message sequence number'),
  message: z.string().describe('Decoded message content'),
  timestamp: z.string().describe('Human-readable timestamp'),
  consensusTimestamp: TimestampSchema.describe('Hedera consensus timestamp'),
});

export type FindMessageOutput = z.infer<typeof FindMessageOutputSchema>;
/**
 * Find Messages Command Output Schema
 * Defines the structure of message query results with unified array format
 */
export const FindMessagesOutputSchema = z.object({
  topicId: EntityIdSchema,
  messages: z.array(FindMessageOutputSchema).describe('Messages found'),
  totalCount: z.number().describe('Total number of messages found'),
  network: NetworkSchema,
});

// Infer TypeScript type from schema for type safety
export type FindMessagesOutput = z.infer<typeof FindMessagesOutputSchema>;

/**
 * Human-readable Handlebars template for find messages output
 * Handles both single and multiple message results uniformly
 */
export const FIND_MESSAGES_TEMPLATE = `
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
