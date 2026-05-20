import { z } from 'zod';

import {
  KeyManagerTypeSchema,
  OptionalDefaultEmptyKeyListSchema,
  ScheduleReferenceObjectSchema,
} from '@/core/schemas';

export const ScheduleSignInputSchema = z.object({
  schedule: ScheduleReferenceObjectSchema.describe(
    'Schedule ID in format (0.0.x) or local schedule name',
  ),
  key: OptionalDefaultEmptyKeyListSchema.describe(
    'Key(s) whose signature to add to the schedule. Repeat the flag for multiple keys. If omitted, the admin key from the mirror node is matched against the key manager.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager to use: local or local_encrypted (defaults to config setting)',
  ),
});

export type ScheduleSignInput = z.infer<typeof ScheduleSignInputSchema>;
