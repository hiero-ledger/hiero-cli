import { z } from 'zod';

import {
  AccountNameSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

/**
 * Input schema for account import command
 * Validates arguments for importing an existing account
 */
export const AccountImportInputSchema = z.object({
  key: KeySchema.describe(
    'Account credentials. Can be accountId:privateKey pair, key reference or account alias.',
  ),
  name: AccountNameSchema.optional().describe('Optional account name/alias'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type AccountImportInput = z.infer<typeof AccountImportInputSchema>;
