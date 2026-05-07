import { z } from 'zod';

import { AliasNameSchema, NetworkSchema } from '@/core';

export const ScheduleVerifyOutputSchema = z.object({
  scheduleId: z.string().optional(),
  network: NetworkSchema,
  name: AliasNameSchema.optional(),
  executed: z.boolean(),
  executedAt: z.string().nullable().optional(),
  deleted: z.boolean().optional(),
  waitForExpiry: z.boolean(),
  scheduleMemo: z.string().nullable().optional(),
  expirationTime: z.string().nullable().optional(),
  payerAccountId: z.string().nullable().optional(),
  command: z.string().optional(),
});

export type ScheduleVerifyOutput = z.infer<typeof ScheduleVerifyOutputSchema>;

export const SCHEDULE_VERIFY_TEMPLATE = `
{{#if scheduleId}}
✅ Schedule verified: {{hashscanLink scheduleId "schedule" network}}
{{else}}
Schedule "{{name}}" status:
{{/if}}
{{#if name}}
   Name:            {{name}}
{{/if}}
   Executed:        {{executed}}
{{#if executedAt}}
   Executed at:     {{executedAt}}
{{/if}}
{{#if deleted}}
   Deleted:         {{deleted}}
{{/if}}
   Wait for expiry: {{waitForExpiry}}
{{#if scheduleMemo}}
   Memo:            {{scheduleMemo}}
{{/if}}
{{#if expirationTime}}
   Expiration:      {{expirationTime}}
{{/if}}
{{#if payerAccountId}}
   Payer:           {{payerAccountId}}
{{/if}}
{{#if command}}
   Command:         {{command}}
{{/if}}
`.trim();
