import { z } from 'zod';

import { AliasNameSchema } from '@/core';

/**
 * CLI args for the scheduled hook (injected next to command options)
 */
export const ScheduledInputSchema = z.object({
  scheduled: AliasNameSchema.optional().describe(
    'Name of the schedule record in the local state',
  ),
});
