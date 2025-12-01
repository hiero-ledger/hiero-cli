import { z } from 'zod';
import { StateNamespaceSchema } from '../../../../core/schemas';

/**
 * Input schema for state-management list command
 * Validates arguments for listing state data
 */
export const ListStateInputSchema = z.object({
  namespace: StateNamespaceSchema.optional().describe(
    'Namespace name for lookup. If not provided, lists all namespaces.',
  ),
});

export type ListStateInput = z.infer<typeof ListStateInputSchema>;
