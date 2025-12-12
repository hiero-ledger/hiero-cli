import { z } from 'zod';
import {
  AccountNameSchema,
  KeyManagerTypeSchema,
  AccountIdWithPrivateKeySchema,
} from '../../../../core/schemas';

/**
 * Input schema for account import command
 * Validates arguments for importing an existing account
 */
export const ImportAccountInputSchema = z.object({
  key: AccountIdWithPrivateKeySchema.describe(
    'Account ID with private key in format accountId:privateKey',
  ),
  name: AccountNameSchema.optional().describe('Optional account name/alias'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type ImportAccountInput = z.infer<typeof ImportAccountInputSchema>;
