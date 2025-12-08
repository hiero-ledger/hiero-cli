/**
 * Submit Message Command Output Schema and Template
 */
import { z } from 'zod';
import {
  EntityIdSchema,
  TransactionIdSchema,
  IsoTimestampSchema,
} from '../../../../core/schemas';

/**
 * Submit Message Command Output Schema
 * Defines the structure of successful message submission output
 */
export const SubmitMessageOutputSchema = z.object({
  topicId: EntityIdSchema,
  message: z.string().describe('The submitted message content'),
  sequenceNumber: z
    .number()
    .int()
    .positive()
    .describe('Message sequence number in topic'),
  transactionId: TransactionIdSchema,
  submittedAt: IsoTimestampSchema,
});

// Infer TypeScript type from schema for type safety
export type SubmitMessageOutput = z.infer<typeof SubmitMessageOutputSchema>;

/**
 * Human-readable Handlebars template for submit message output
 * Matches the current CLI output format for consistency
 */
export const SUBMIT_MESSAGE_TEMPLATE = `
✅ Message submitted successfully
   Topic ID: {{topicId}}
   Message: "{{message}}"
   Sequence Number: {{sequenceNumber}}
   Transaction ID: {{transactionId}}
`.trim();
