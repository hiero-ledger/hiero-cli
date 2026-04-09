import { z } from 'zod';

import {
  AliasNameSchema,
  EntityIdSchema,
  KeyManagerTypeSchema,
} from '@/core/schemas';

export const ScheduleVerifyInputSchema = z
  .object({
    name: AliasNameSchema.optional().describe('Local name of schedule record'),
    scheduleId: EntityIdSchema.optional().describe(
      'Schedule ID in format (0.0.x)',
    ),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager to use: local or local_encrypted (defaults to config setting)',
    ),
  })
  .refine(
    (schema) => schema.name !== undefined || schema.scheduleId !== undefined,
    'Either schedule name or schedule ID must be provided',
  );

export type ScheduleVerifyInput = z.infer<typeof ScheduleVerifyInputSchema>;
