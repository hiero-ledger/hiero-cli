/**
 * Find Messages Command Output Schema and Template
 */
import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../../../../core/schemas';

/**
 * Find Messages Command Output Schema
 * Defines the structure of message query results with unified array format
 */
export const FindMessagesOutputSchema = z.object({
  topicId: EntityIdSchema,
  messages: z.array(
    z.object({
      sequenceNumber: z
        .number()
        .int()
        .positive()
        .describe('Message sequence number'),
      message: z.string().describe('Decoded message content'),
      timestamp: z.string().describe('Human-readable timestamp'),
      consensusTimestamp: TimestampSchema.describe(
        'Hedera consensus timestamp',
      ),
    }),
  ),
  totalCount: z.number().describe('Total number of messages found'),
});

// Infer TypeScript type from schema for type safety
export type FindMessagesOutput = z.infer<typeof FindMessagesOutputSchema>;

/**
 * Human-readable Handlebars template for find messages output
 * Handles both single and multiple message results uniformly
 */
export const FIND_MESSAGES_TEMPLATE = `
{{#if (eq totalCount 0)}}
No messages found in topic {{topicId}}
{{else}}
Found {{totalCount}} message(s) in topic {{topicId}}
──────────────────────────────────────
{{#each messages}}
{{add1 @index}}. Sequence #{{sequenceNumber}}
   Message: "{{message}}"
   Timestamp: {{timestamp}}
{{#unless @last}}

{{/unless}}
{{/each}}
──────────────────────────────────────
{{/if}}
`.trim();
