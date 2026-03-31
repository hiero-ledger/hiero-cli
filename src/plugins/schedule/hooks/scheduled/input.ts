import { z } from 'zod';

import { AliasNameSchema } from '@/core';

/**
 * CLI args for the scheduled hook (injected next to command options)
 */
export const ScheduledInputSchema = z.object({
  scheduled: AliasNameSchema.describe('Scheduled name').optional(),
});
