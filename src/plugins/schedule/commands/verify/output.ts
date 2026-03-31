import { z } from 'zod';

import { AliasNameSchema, NetworkSchema } from '@/core';

export const ScheduleVerifyOutputSchema = z.object({
  scheduleId: z.string(),
  network: NetworkSchema,
  name: AliasNameSchema.optional(),
  executedAt: z.string().nullable().optional(),
  deleted: z.boolean(),
  waitForExpiry: z.boolean(),
  scheduleMemo: z.string().nullable().optional(),
  expirationTime: z.string().nullable().optional(),
  payerAccountId: z.string().nullable().optional(),
});

export type ScheduleVerifyOutput = z.infer<typeof ScheduleVerifyOutputSchema>;

export const SCHEDULE_VERIFY_TEMPLATE = `
✅ Schedule verified: {{#if scheduleId}}{{hashscanLink scheduleId "scheduled" network}}{{/if}}
{{#if name}}
   Name: {{name}}
{{/if}}
{{#if executedAt}}
   Executed: {{executedAt}}
{{/if}}
   Deleted: {{deleted}}
   Wait for expiry: {{waitForExpiry}}
{{#if scheduleMemo}}
   Memo: {{scheduleMemo}}
{{/if}}
{{#if expirationTime}}
   Expiration: {{expirationTime}}
{{/if}}
{{#if payerAccountId}}
   Payer: {{payerAccountId}}
{{/if}}
`.trim();
