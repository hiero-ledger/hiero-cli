/**
 * Submit Message Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  IsoTimestampSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas';

/**
 * Submit Message Command Output Schema
 * Defines the structure of successful message submission output
 */
export const TopicSubmitMessageOutputSchema = z.object({
  topicId: EntityIdSchema,
  message: z.string().describe('The submitted message content'),
  sequenceNumber: z
    .number()
    .int()
    .positive()
    .describe('Message sequence number in topic'),
  transactionId: TransactionIdSchema,
  submittedAt: IsoTimestampSchema,
  network: NetworkSchema,
});

// Infer TypeScript type from schema for type safety
export type SubmitMessageOutput = z.infer<
  typeof TopicSubmitMessageOutputSchema
>;

/**
 * Human-readable Handlebars template for submit message output
 * Matches the current CLI output format for consistency
 */
export const TOPIC_SUBMIT_MESSAGE_TEMPLATE = `
✅ Message submitted successfully
   Topic ID: {{hashscanLink topicId "topic" network}}
   Message: "{{{message}}}"
   Sequence Number: {{sequenceNumber}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
