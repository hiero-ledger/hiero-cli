import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const WatchOutputSchema = z.object({
  scheduleId: EntityIdSchema,
  /** Terminal state reached */
  finalState: z.enum(['EXECUTED', 'DELETED', 'TIMEOUT']),
  /** ISO-8601 timestamp when the terminal state was detected */
  resolvedAt: z.string(),
  /** Total seconds spent polling */
  elapsedSeconds: z.number(),
  network: z.string(),
});

export type WatchOutput = z.infer<typeof WatchOutputSchema>;

export const WATCH_HUMAN_TEMPLATE = `
Schedule Watch Complete
  Schedule ID:    {{scheduleId}}  ({{hashscanLink scheduleId}})
  Final State:    {{finalState}}
  Resolved At:    {{resolvedAt}}
  Elapsed:        {{elapsedSeconds}}s
  Network:        {{network}}
`.trim();
