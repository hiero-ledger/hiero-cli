import { z } from 'zod';

import {
  KeyManagerTypeSchema,
  KeySchema,
  ScheduleReferenceObjectSchema,
} from '@/core/schemas';

export const ScheduleDeleteInputSchema = z.object({
  schedule: ScheduleReferenceObjectSchema,
  adminKey: KeySchema.describe(
    'Admin key for the schedule (must match the admin key set at creation)',
  ).optional(),
  keyManager: KeyManagerTypeSchema.optional(),
});

export type ScheduleDeleteInput = z.infer<typeof ScheduleDeleteInputSchema>;
