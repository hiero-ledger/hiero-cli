/**
 * Schedule plugin state — persisted schedule entries and options for the scheduled hook
 */
import { ScheduledTransactionDataSchema } from '@/core/schemas/common-schemas';

/** Zustand namespace for persisted schedule entries */
export const SCHEDULE_NAMESPACE = 'schedule-transactions';

export function safeParseScheduledTransactionData(data: unknown) {
  return ScheduledTransactionDataSchema.safeParse(data);
}
