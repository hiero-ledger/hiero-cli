import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const StatusInputSchema = z.object({
  /** The schedule ID to look up, e.g. "0.0.5678" */
  'schedule-id': EntityIdSchema,
});

export type StatusInput = z.infer<typeof StatusInputSchema>;
