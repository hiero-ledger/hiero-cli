import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas';

/**
 * Input schema for network get-operator command
 * Validates arguments for retrieving operator credentials
 */
export const GetOperatorInputSchema = z.object({
  network: NetworkSchema.optional().describe(
    'Target network (defaults to current network)',
  ),
});

export type GetOperatorInput = z.infer<typeof GetOperatorInputSchema>;
