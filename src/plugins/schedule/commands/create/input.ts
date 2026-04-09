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
  name: AliasNameSchema.describe('Name of the schedule. Option required'),
  adminKey: KeySchema.optional().describe(
    'Admin key for the schedule for managing scheduled transaction on Hedera chain',
  ),
  payerAccount: KeySchema.optional().describe(
    'Payer account of token. Must be resolved to account ID with private key. Defaults to operator.',
  ),
  memo: MemoSchema.describe('Public schedule memo (max 100 bytes)'),
  expiration: ScheduleExpirationSchema,
  waitForExpiry: WaitForExpirySchema.describe(
    'Execute at expiration time instead of when signatures are complete',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager to use: local or local_encrypted (defaults to config setting)',
  ),
});

export type ScheduleCreateInput = z.infer<typeof ScheduleCreateInputSchema>;
