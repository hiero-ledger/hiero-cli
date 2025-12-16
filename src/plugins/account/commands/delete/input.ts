import { z } from 'zod';

import { AccountNameSchema, EntityIdSchema } from '@/core/schemas';

/**
 * Input schema for account delete command
 * At least one of name or id must be provided
 */
export const DeleteAccountInputSchema = z
  .object({
    name: AccountNameSchema.optional().describe(
      'Account name to delete from state',
    ),
    id: EntityIdSchema.optional().describe(
      'Account ID to delete from state (format: 0.0.xxx)',
    ),
  })
  .refine((data) => data.name !== undefined || data.id !== undefined, {
    message: 'At least one of "name" or "id" must be provided',
    path: ['name', 'id'],
  });

export type DeleteAccountInput = z.infer<typeof DeleteAccountInputSchema>;
