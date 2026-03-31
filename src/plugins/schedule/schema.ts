/**
 * Schedule plugin state — persisted schedule entries and options for the scheduled hook
 */
import { z } from 'zod';

import {
  AliasNameSchema,
  EntityIdSchema,
  KeyManagerTypeSchema,
  KeyReferenceSchema,
  PublicKeyDefinitionSchema,
} from '@/core/schemas/common-schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

/** Zustand namespace for persisted schedule entries */
export const SCHEDULE_NAMESPACE = 'schedule-transactions';

export const ScheduledTransactionDataSchema = z.object({
  name: AliasNameSchema,
  scheduledId: EntityIdSchema.optional(),
  network: z.enum(SupportedNetwork),
  keyManager: KeyManagerTypeSchema,
  adminKeyRefId: KeyReferenceSchema.optional(),
  adminPublicKey: PublicKeyDefinitionSchema.optional(),
  payerAccountId: EntityIdSchema.optional(),
  payerKeyRefId: KeyReferenceSchema.optional(),
  memo: z.string().max(100).optional(),
  expirationTime: z.string().optional(),
  waitForExpiry: z.boolean().default(false),
  scheduled: z.boolean().default(false),
  executed: z.boolean().default(false),
  normalizedParams: z
    .record(z.string(), z.unknown())
    .default({})
    .optional()
    .describe(
      'Normalized params from the command that produced this transaction',
    ),
  createdAt: z.string().optional(),
});

export type ScheduledTransactionData = z.infer<
  typeof ScheduledTransactionDataSchema
>;

export function safeParseScheduledTransactionData(data: unknown) {
  return ScheduledTransactionDataSchema.safeParse(data);
}
