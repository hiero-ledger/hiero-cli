import { z } from 'zod';

import {
  AccountReferenceSchema,
  AmountInputSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  PrivateKeyWithAccountIdSchema,
} from '@/core/schemas';

/**
 * Input schema for token transfer command
 * Validates arguments for transferring tokens between accounts
 */
export const TransferFungibleTokenInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  to: AccountReferenceSchema.describe(
    'Destination account (ID, EVM address, or name)',
  ),
  from: PrivateKeyWithAccountIdSchema.optional().describe(
    'Account to transfer from. Can be {accountId}:{privateKey pair}, key reference or account alias. Defaults to operator.',
  ),
  amount: AmountInputSchema.describe(
    'Amount to transfer (display units or base units with "t" suffix)',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TransferFungibleTokenInput = z.infer<
  typeof TransferFungibleTokenInputSchema
>;
