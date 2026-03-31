import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas';

export const TopicUpdateOutputSchema = z.object({
  topicId: EntityIdSchema,
  name: z.string().optional(),
  network: NetworkSchema,
  updatedFields: z.array(z.string()),
  memo: z.string().optional(),
  adminKeyPresent: z.boolean(),
  submitKeyPresent: z.boolean(),
  adminKeyThreshold: z.number().int().min(0),
  adminKeyCount: z.number().int().positive().optional(),
  submitKeyThreshold: z.number().int().min(0),
  submitKeyCount: z.number().int().positive().optional(),
  autoRenewAccount: z.string().optional(),
  autoRenewPeriod: z.number().int().positive().optional(),
  expirationTime: z.string().optional(),
  transactionId: TransactionIdSchema,
});

export type TopicUpdateOutput = z.infer<typeof TopicUpdateOutputSchema>;

export const TOPIC_UPDATE_TEMPLATE = `
✅ Topic updated successfully: {{hashscanLink topicId "topic" network}}
   Network: {{network}}
{{#if name}}
   Name: {{name}}
{{/if}}
   Updated: {{updatedFields}}
{{#if memo}}
   Memo: {{memo}}
{{/if}}
   Admin key: {{#if adminKeyPresent}}✅ Present{{#if adminKeyCount}}{{#if adminKeyThreshold}} ({{adminKeyThreshold}}-of-{{adminKeyCount}}){{else}} ({{adminKeyCount}}-of-{{adminKeyCount}}){{/if}}{{/if}}{{else}}❌ Not set{{/if}}
   Submit key: {{#if submitKeyPresent}}✅ Present{{#if submitKeyCount}}{{#if submitKeyThreshold}} ({{submitKeyThreshold}}-of-{{submitKeyCount}}){{else}} ({{submitKeyCount}}-of-{{submitKeyCount}}){{/if}}{{/if}}{{else}}❌ Not set (public topic){{/if}}
{{#if autoRenewAccount}}
   Auto-renew account: {{autoRenewAccount}}
{{/if}}
{{#if autoRenewPeriod}}
   Auto-renew period: {{autoRenewPeriod}}s
{{/if}}
{{#if expirationTime}}
   Expiration: {{expirationTime}}
{{/if}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
