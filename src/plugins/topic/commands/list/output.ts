/**
 * List Topics Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  IsoTimestampSchema,
  NetworkSchema,
} from '@/core/schemas';

/**
 * List Topics Command Output Schema
 * Contains array of topics and calculated statistics
 */
export const ListTopicsOutputSchema = z.object({
  topics: z.array(
    z.object({
      name: z.string().describe('Topic name or alias'),
      topicId: EntityIdSchema,
      network: NetworkSchema,
      memo: z.string().describe('Topic memo').nullable(),
      adminKeyPresent: z.boolean().describe('Whether admin key is set'),
      submitKeyPresent: z.boolean().describe('Whether submit key is set'),
      createdAt: IsoTimestampSchema,
    }),
  ),
  totalCount: z.number().describe('Total number of topics'),
  // Statistics for template rendering (calculated in handler)
  stats: z.object({
    withAdminKey: z.number().describe('Count of topics with admin key'),
    withSubmitKey: z.number().describe('Count of topics with submit key'),
    withMemo: z.number().describe('Count of topics with memo'),
    byNetwork: z
      .record(z.number(), z.number())
      .describe('Count of topics by network'),
  }),
});

// Infer TypeScript type from schema for type safety
export type ListTopicsOutput = z.infer<typeof ListTopicsOutputSchema>;

/**
 * Human-readable Handlebars template for list topics output
 * Includes statistics calculated by handler and passed in output data
 */
export const LIST_TOPICS_TEMPLATE = `
{{#if (eq totalCount 0)}}
📝 No topics found
{{else}}
📝 Found {{totalCount}} topic(s):

{{#each topics}}
{{add1 @index}}. Name: {{name}}
   Topic ID: {{topicId}}
   Network: {{network}}
{{#if memo}}
   Memo: {{memo}}
{{/if}}
   Admin Key: {{#if adminKeyPresent}}✅ Present{{else}}❌ Not Present{{/if}}
   Submit Key: {{#if submitKeyPresent}}✅ Present{{else}}❌ Not Present{{/if}}
   Created: {{createdAt}}

{{/each}}
{{/if}}
`.trim();
