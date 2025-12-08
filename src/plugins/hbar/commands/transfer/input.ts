import { z } from 'zod';
import {
  AccountOrAliasSchema,
  AccountReferenceSchema,
  AmountInputSchema,
  KeyManagerTypeSchema,
  MemoSchema,
} from '../../../../core/schemas';

/**
 * Input schema for hbar transfer command
 * Validates arguments for transferring HBAR between accounts
 */
export const TransferInputSchema = z.object({
  amount: AmountInputSchema.describe(
    'Amount to transfer. Format: "100" (HBAR) or "100t" (tinybars)',
  ),
  to: AccountReferenceSchema.describe(
    'Account ID, EVM address, or name to transfer to',
  ),
  from: AccountOrAliasSchema.optional().describe(
    'Account to transfer from. Can be AccountID:privateKey pair or account name. Defaults to operator.',
  ),
  memo: MemoSchema.describe('Optional memo for the transfer'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TransferInput = z.infer<typeof TransferInputSchema>;
