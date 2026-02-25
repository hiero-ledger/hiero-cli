import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

/**
 * Zod schema for `schedule:create` command arguments.
 *
 * `amount` is accepted as a decimal-string so that callers do not lose
 * precision when dealing with large tinybar values (> Number.MAX_SAFE_INTEGER).
 */
export const CreateInputSchema = z.object({
  /** Recipient Hedera account ID, e.g. "0.0.1234" */
  to: EntityIdSchema,

  /**
   * Amount to transfer, expressed in tinybars.
   * Accepts a plain integer string, e.g. "50000000" (= 0.5 ℏ).
   */
  amount: z
    .string()
    .regex(/^\d+$/, 'Amount must be a non-negative integer string (tinybars)'),

  /**
   * Seconds from now until the schedule expires.
   * Defaults to 2592000 (30 days).  Maximum is 5184000 (60 days – network limit).
   */
  'expiry-seconds': z
    .number()
    .int()
    .positive()
    .max(5_184_000, 'Expiry cannot exceed 60 days (5184000 s)')
    .optional()
    .default(2_592_000),

  /** Optional human-readable memo stored on the scheduled transaction. */
  memo: z.string().max(100).optional(),
});

export type CreateInput = z.infer<typeof CreateInputSchema>;
