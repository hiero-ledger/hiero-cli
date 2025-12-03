import { z } from 'zod';
import { StateNamespaceSchema } from '../../../../core/schemas';

/**
 * Input schema for state-management clear command
 * Validates arguments for clearing state data
 * Requires confirm flag to actually delete data (safety mechanism)
 */
export const ClearStateInputSchema = z.object({
  namespace: StateNamespaceSchema.optional().describe(
    'Namespace to clear. If not provided, clears ALL state data.',
  ),
  confirm: z
    .boolean()
    .default(false)
    .describe(
      'Confirmation flag to prevent accidental deletion. Must be true to proceed.',
    ),
});

export type ClearStateInput = z.infer<typeof ClearStateInputSchema>;
