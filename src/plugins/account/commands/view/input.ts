import { z } from 'zod';

import { AccountReferenceSchema } from '@/core/schemas';

/**
 * Input schema for account view command
 * Validates arguments for viewing detailed account information
 */
export const AccountViewInputSchema = z.object({
  account: AccountReferenceSchema.describe(
    'Account identifier (ID, EVM address, or name)',
  ),
});

export type AccountViewInput = z.infer<typeof AccountViewInputSchema>;
