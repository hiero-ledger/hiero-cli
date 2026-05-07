import { z } from 'zod';

import {
  KeyManagerTypeSchema,
  ScheduleReferenceObjectSchema,
} from '@/core/schemas';

export const ScheduleVerifyInputSchema = z.object({
  schedule: ScheduleReferenceObjectSchema.describe(
    'Schedule ID in format (0.0.x) or local schedule name',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager to use: local or local_encrypted (defaults to config setting)',
  ),
});

export type ScheduleVerifyInput = z.infer<typeof ScheduleVerifyInputSchema>;
