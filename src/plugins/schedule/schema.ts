/**
 * Schedule plugin state — persisted schedule entries and options for the scheduled hook
 */
import type { z } from 'zod';

import { ScheduledTransactionDataSchema } from '@/core/schemas/common-schemas';

/** Zustand namespace for persisted schedule entries */
export const SCHEDULE_NAMESPACE = 'schedule-transactions';

export type ScheduledTransactionData = z.infer<
  typeof ScheduledTransactionDataSchema
>;

export function safeParseScheduledTransactionData(data: unknown) {
  return ScheduledTransactionDataSchema.safeParse(data);
}
