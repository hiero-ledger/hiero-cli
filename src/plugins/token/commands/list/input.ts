import { NetworkSchema } from '../../../../core/schemas';
import { z } from 'zod';

/**
 * Input schema for token list command
 * Validates arguments for listing tokens
 */
export const ListTokenInputSchema = z.object({
  keys: z
    .boolean()
    .default(false)
    .describe(
      'Show token key information (admin, supply, wipe, etc.). Default: false',
    ),
  network: NetworkSchema.optional().describe(
    'Filter tokens by network. Defaults to current active network.',
  ),
});

export type ListTokenInput = z.infer<typeof ListTokenInputSchema>;
