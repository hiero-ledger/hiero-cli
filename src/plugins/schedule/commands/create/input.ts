import { z } from 'zod';

import {
  AliasNameSchema,
  KeyManagerTypeSchema,
  KeySchema,
  MemoSchema,
  ScheduleExpirationSchema,
  WaitForExpirySchema,
} from '@/core/schemas';

/**
 * schedule create — same idea as batch create: local state + key ref + schedule options for the hook
 */
export const ScheduleCreateInputSchema = z.object({
  name: AliasNameSchema.describe('Local name for this schedule'),
  adminKey: KeySchema.optional().describe(
    'Admin key for the schedule (optional). Enables schedule delete later.',
  ),
  payerAccount: KeySchema.optional().describe(
    'Account that pays execution fees for the scheduled transaction (optional).',
  ),
  memo: MemoSchema.describe('Public schedule memo (max 100 bytes)'),
  expiration: ScheduleExpirationSchema,
  waitForExpiry: WaitForExpirySchema,
  keyManager: KeyManagerTypeSchema.optional(),
});

export type ScheduleCreateInput = z.infer<typeof ScheduleCreateInputSchema>;
