/**
 * Batchify Hook Output Schema and Template
 */
import { z } from 'zod';

import { EntityIdSchema, NetworkSchema, TransactionIdSchema } from '@/core';

/**
 * Execute Batch Command Output Schema
 */
export const ScheduledOutputSchema = z.object({
  scheduledName: z.string().describe('Scheduled record name'),
  scheduledId: EntityIdSchema,
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
});

export type ScheduledOutput = z.infer<typeof ScheduledOutputSchema>;

/**
 * Human-readable template for execute batch output
 */
export const SCHEDULED_TEMPLATE = `
✅ Transaction scheduled successfully
   Schedule name: {{scheduledName}}
   Schedule ID: {{hashscanLink scheduledId "schedule" network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
