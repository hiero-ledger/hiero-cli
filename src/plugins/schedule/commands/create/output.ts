import { z } from 'zod';

import { EntityIdSchema, KeyThresholdOptionalSchema } from '@/core';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ScheduleCreateOutputSchema = z.object({
  name: z.string(),
  waitForExpiry: z.boolean().default(false),
  payerAccountId: EntityIdSchema.optional(),
  adminKeyPresent: z.boolean(),
  adminKeyCount: z.number().int().positive().optional(),
  adminKeyThreshold: KeyThresholdOptionalSchema,
  expirationTime: z.string().optional(),
  memo: z.string().optional(),
  network: z.enum(SupportedNetwork),
});

export type ScheduleCreateOutput = z.infer<typeof ScheduleCreateOutputSchema>;

export const SCHEDULE_CREATE_TEMPLATE = `
✅ Scheduled record created successfully
   Name: {{name}}
   Wait for expiry: {{waitForExpiry}}
   Network: {{network}}
{{#if payerAccountId}}
   Payer account ID: {{payerAccountId}}
{{/if}}
   Admin key: {{#if adminKeyPresent}}✅ Present{{#if adminKeyCount}}{{#if adminKeyThreshold}} ({{adminKeyThreshold}}-of-{{adminKeyCount}}){{else}} ({{adminKeyCount}}-of-{{adminKeyCount}}){{/if}}{{/if}}{{else}}❌ Not set{{/if}}
{{#if expirationTime}}
   Expiration Date: {{expirationTime}}
{{/if}}
{{#if memo}}
   Memo: {{memo}}
{{/if}}
`.trim();
