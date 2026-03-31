import { z } from 'zod';

import {
  KeyManagerTypeSchema,
  KeySchema,
  ScheduleReferenceObjectSchema,
} from '@/core/schemas';

export const ScheduleSignInputSchema = z.object({
  schedule: ScheduleReferenceObjectSchema,
  key: KeySchema.describe(
    'Private key or credential for the signature being added to the schedule',
  ),
  keyManager: KeyManagerTypeSchema.optional(),
});

export type ScheduleSignInput = z.infer<typeof ScheduleSignInputSchema>;
