/**
 * Create Topic Command Output Schema and Template
 */
import { z } from 'zod';
import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
  IsoTimestampSchema,
} from '../../../../core/schemas';

/**
 * Create Topic Command Output Schema
 * Defines the structure of successful topic creation output
 */
export const CreateTopicOutputSchema = z.object({
  topicId: EntityIdSchema,
  name: z.string().describe('Topic name or alias'),
  network: NetworkSchema,
  memo: z.string().describe('Topic memo').optional(),
  adminKeyPresent: z.boolean().describe('Whether admin key is set'),
  submitKeyPresent: z.boolean().describe('Whether submit key is set'),
  transactionId: TransactionIdSchema,
  createdAt: IsoTimestampSchema,
});

// Infer TypeScript type from schema for type safety
export type CreateTopicOutput = z.infer<typeof CreateTopicOutputSchema>;

/**
 * Human-readable Handlebars template for create topic output
 * Matches the current CLI output format for consistency
 */
export const CREATE_TOPIC_TEMPLATE = `
✅ Topic created successfully: {{topicId}}
   Network: {{network}}
   Name (Alias): {{name}}
{{#if memo}}
   Memo: {{memo}}
{{/if}}
   Admin key: {{#if adminKeyPresent}}✅ Present{{else}}❌ Not set{{/if}}
   Submit key: {{#if submitKeyPresent}}✅ Present{{else}}❌ Not set{{/if}}
   Transaction ID: {{transactionId}}
`.trim();
