import { z } from 'zod';

import {
  KeyManagerTypeSchema,
  KeySchema,
  ScheduleReferenceObjectSchema,
} from '@/core/schemas';

export const ScheduleDeleteInputSchema = z.object({
  schedule: ScheduleReferenceObjectSchema.describe(
    'Schedule id (0.0.x) or local schedule name',
  ),
  adminKey: KeySchema.optional().describe(
    'Admin key to sign the transaction. If not provided the admin key from state is used to perform this operation.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager to use: local or local_encrypted (defaults to config setting)',
  ),
});

export type ScheduleDeleteInput = z.infer<typeof ScheduleDeleteInputSchema>;
