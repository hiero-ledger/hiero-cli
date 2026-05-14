import { z } from 'zod';

import {
  KeyManagerTypeSchema,
  OptionalDefaultEmptyKeyListSchema,
  ScheduleReferenceObjectSchema,
} from '@/core/schemas';

export const ScheduleDeleteInputSchema = z.object({
  schedule: ScheduleReferenceObjectSchema.describe(
    'Schedule id (0.0.x) or local schedule name',
  ),
  adminKey: OptionalDefaultEmptyKeyListSchema.describe(
    'Admin credential(s) to sign the delete transaction. Pass multiple times for threshold keys. Auto-detected from the key manager if omitted.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager to use: local or local_encrypted (defaults to config setting)',
  ),
});

export type ScheduleDeleteInput = z.infer<typeof ScheduleDeleteInputSchema>;
