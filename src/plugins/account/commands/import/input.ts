import { z } from 'zod';
import {
  PrivateKeyWithTypeSchema,
  AccountNameSchema,
  EntityIdSchema,
  KeyManagerTypeSchema,
} from '../../../../core/schemas';

/**
 * Input schema for account import command
 * Validates arguments for importing an existing account
 */
export const ImportAccountInputSchema = z.object({
  id: EntityIdSchema.describe('Hedera account ID (format: 0.0.xxx)'),
  key: PrivateKeyWithTypeSchema.describe(
    'Private key with optional type prefix (e.g., "ed25519:..." or "ecdsa:...")',
  ),
  name: AccountNameSchema.optional().describe('Optional account name/alias'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type ImportAccountInput = z.infer<typeof ImportAccountInputSchema>;
