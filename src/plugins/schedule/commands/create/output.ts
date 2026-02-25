import { z } from 'zod';

import { EntityIdSchema, TransactionIdSchema } from '@/core/schemas/common-schemas';

/**
 * Zod schema for the JSON payload returned by a successful `schedule:create`.
 */
export const CreateOutputSchema = z.object({
  /** The newly created schedule ID, e.g. "0.0.5678" */
  scheduleId: EntityIdSchema,

  /** The Hedera transaction ID that created the schedule */
  transactionId: TransactionIdSchema,

  /** Account ID of the operator that submitted the create transaction */
  payer: EntityIdSchema,

  /** Expiry window (seconds from creation) that was requested */
  expirySeconds: z.number().int().positive(),

  /** Network the transaction was submitted to */
  network: z.string(),

  /** Optional memo */
  memo: z.string().optional(),
});

export type CreateScheduleOutput = z.infer<typeof CreateOutputSchema>;

/** Handlebars template rendered when --output human (default) */
export const CREATE_HUMAN_TEMPLATE = `
Scheduled Transaction Created
  Schedule ID:    {{scheduleId}}  ({{hashscanLink scheduleId}})
  Transaction ID: {{transactionId}}
  Payer:          {{payer}}
  Expiry:         {{expirySeconds}}s from submission
  Network:        {{network}}
{{#if memo}}  Memo:           {{memo}}
{{/if}}
Use \`schedule:status --schedule-id {{scheduleId}}\` to track execution.
`.trim();
