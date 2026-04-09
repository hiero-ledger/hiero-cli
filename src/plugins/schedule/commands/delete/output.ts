import { z } from 'zod';

import {
  AliasNameSchema,
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core';

export const ScheduleDeleteOutputSchema = z.object({
  name: AliasNameSchema,
  scheduleId: EntityIdSchema.optional(),
  transactionId: TransactionIdSchema.optional(),
  network: NetworkSchema,
});

export type ScheduleDeleteOutput = z.infer<typeof ScheduleDeleteOutputSchema>;

export const SCHEDULE_DELETE_TEMPLATE = `
✅ Scheduled record deleted successfully: {{#if scheduleId}}{{hashscanLink scheduleId "scheduled" network}}{{/if}}
   Name: {{name}}
{{#if transactionId}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
{{/if}}
`.trim();
