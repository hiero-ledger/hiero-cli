/**
 * Create Topic Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  IsoTimestampSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas';

/**
 * Create Topic Command Output Schema
 * Defines the structure of successful topic creation output
 */
export const TopicCreateOutputSchema = z.object({
  topicId: EntityIdSchema,
  name: z.string().describe('Topic name or alias').optional(),
  network: NetworkSchema,
  memo: z.string().describe('Topic memo').optional(),
  adminKeyPresent: z.boolean().describe('Whether admin key is set'),
  submitKeyPresent: z.boolean().describe('Whether submit key is set'),
  adminKeyThreshold: z
    .number()
    .int()
    .min(0)
    .describe('Admin key threshold (M-of-N)'),
  adminKeyCount: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Total number of admin keys'),
  submitKeyThreshold: z
    .number()
    .int()
    .min(0)
    .describe('Submit key threshold (M-of-N)'),
  submitKeyCount: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Total number of submit keys'),
  transactionId: TransactionIdSchema,
  createdAt: IsoTimestampSchema,
});

// Infer TypeScript type from schema for type safety
export type TopicCreateOutput = z.infer<typeof TopicCreateOutputSchema>;

/**
 * Human-readable Handlebars template for create topic output
 * Matches the current CLI output format for consistency
 */
export const TOPIC_CREATE_TEMPLATE = `
✅ Topic created successfully: {{hashscanLink topicId "topic" network}}
   Network: {{network}}
{{#if name}}
   Name: {{name}}
{{/if}}
{{#if memo}}
   Memo: {{memo}}
{{/if}}
   Admin key: {{#if adminKeyPresent}}✅ Present{{#if adminKeyCount}}{{#if adminKeyThreshold}} ({{adminKeyThreshold}}-of-{{adminKeyCount}}){{else}} ({{adminKeyCount}}-of-{{adminKeyCount}}){{/if}}{{/if}}{{else}}❌ Not set{{/if}}
   Submit key: {{#if submitKeyPresent}}✅ Present{{#if submitKeyCount}}{{#if submitKeyThreshold}} ({{submitKeyThreshold}}-of-{{submitKeyCount}}){{else}} ({{submitKeyCount}}-of-{{submitKeyCount}}){{/if}}{{/if}}{{else}}❌ Not set (public topic){{/if}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
