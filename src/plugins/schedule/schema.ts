/**
 * Schedule plugin state — persisted schedule entries and options for the scheduled hook
 */
import { z } from 'zod';

import {
  AliasNameSchema,
  EntityIdSchema,
  KeyManagerTypeSchema,
  KeyReferenceSchema,
  NetworkSchema,
  PublicKeyDefinitionSchema,
  ScheduledTransactionDataSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/** Zustand namespace for persisted schedule entries */
export const SCHEDULE_NAMESPACE = 'schedule-transactions';

export type ScheduledTransactionData = z.infer<
  typeof ScheduledTransactionDataSchema
>;

export function safeParseScheduledTransactionData(data: unknown) {
  return ScheduledTransactionDataSchema.safeParse(data);
}
