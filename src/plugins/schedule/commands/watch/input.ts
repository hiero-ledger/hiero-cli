import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const WatchInputSchema = z.object({
  /** The schedule ID to watch, e.g. "0.0.5678" */
  'schedule-id': EntityIdSchema,

  /**
   * How often to poll the mirror node, in seconds.
   * Defaults to 3.  Minimum 1 s.
   */
  'poll-interval': z.number().int().positive().min(1).optional().default(3),

  /**
   * Maximum number of seconds to wait before giving up.
   * Defaults to 3600 (1 hour).
   */
  timeout: z.number().int().positive().optional().default(3600),
});

export type WatchInput = z.infer<typeof WatchInputSchema>;
