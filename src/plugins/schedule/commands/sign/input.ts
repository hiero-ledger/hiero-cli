import { z } from 'zod';

import {
  KeyManagerTypeSchema,
  KeySchema,
  ScheduleReferenceObjectSchema,
} from '@/core/schemas';

export const ScheduleSignInputSchema = z.object({
  schedule: ScheduleReferenceObjectSchema.describe(
    'Schedule ID in format (0.0.x) or local schedule name',
  ),
  key: KeySchema.optional().describe(
    'Key whose signature to add to the schedule. Key must be resolved to private key. If omitted, the admin key from the mirror node is matched against the key manager.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager to use: local or local_encrypted (defaults to config setting)',
  ),
});

export type ScheduleSignInput = z.infer<typeof ScheduleSignInputSchema>;
