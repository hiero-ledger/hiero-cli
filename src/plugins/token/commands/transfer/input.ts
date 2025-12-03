import { z } from 'zod';
import {
  AccountOrAliasSchema,
  AccountReferenceSchema,
  AmountInputSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
} from '../../../../core/schemas';

/**
 * Input schema for token transfer command
 * Validates arguments for transferring tokens between accounts
 */
export const TransferTokenInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  to: AccountReferenceSchema.describe(
    'Destination account (ID, EVM address, or name)',
  ),
  from: AccountOrAliasSchema.optional().describe(
    'Source account. Can be alias or AccountID:privateKey pair. Defaults to operator.',
  ),
  amount: AmountInputSchema.describe(
    'Amount to transfer (display units or base units with "t" suffix)',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TransferTokenInput = z.infer<typeof TransferTokenInputSchema>;
