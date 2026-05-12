import { z } from 'zod';

import {
  AliasNameSchema,
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core';

export const ScheduleSignOutputSchema = z.object({
  scheduleId: EntityIdSchema,
  transactionId: TransactionIdSchema,
  network: NetworkSchema,
  name: AliasNameSchema.optional(),
});

export type ScheduleSignOutput = z.infer<typeof ScheduleSignOutputSchema>;

export const SCHEDULE_SIGN_TEMPLATE = `
✅ Schedule signed successfully: {{#if scheduleId}}{{hashscanLink scheduleId "schedule" network}}{{/if}}
{{#if name}}
   Name: {{name}}
{{/if}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
