import { z } from 'zod';

import { EntityIdSchema, TokenAliasNameSchema } from '@/core/schemas';

/**
 * Input schema for token delete command
 * At least one of name or id must be provided
 */
export const DeleteTokenInputSchema = z
  .object({
    name: TokenAliasNameSchema.optional().describe(
      'Token alias name to delete from state',
    ),
    id: EntityIdSchema.optional().describe(
      'Token ID to delete from state (format: 0.0.xxx)',
    ),
  })
  .refine((data) => data.name !== undefined || data.id !== undefined, {
    message: 'At least one of "name" or "id" must be provided',
    path: ['name', 'id'],
  });

export type DeleteTokenInput = z.infer<typeof DeleteTokenInputSchema>;
