import { z } from 'zod';

import {
  AliasNameSchema,
  EntityIdSchema,
  KeyManagerTypeSchema,
} from '@/core/schemas';

export const ScheduleVerifyInputSchema = z
  .object({
    name: AliasNameSchema.optional().describe(
      'Local alias of a schedule created with schedule create',
    ),
    scheduleId: EntityIdSchema.optional().describe(
      'Schedule id (0.0.x) when not using a saved name',
    ),
    keyManager: KeyManagerTypeSchema.optional(),
  })
  .refine(
    (schema) => !(schema.name && schema.scheduleId),
    'Either schedule name or schedule ID must be provided',
  );

export type ScheduleVerifyInput = z.infer<typeof ScheduleVerifyInputSchema>;
