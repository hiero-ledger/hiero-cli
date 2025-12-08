import { z } from 'zod';
import {
  AccountNameSchema,
  AccountReferenceSchema,
  AmountInputSchema,
  KeyManagerTypeSchema,
  KeyTypeSchema,
} from '@/core/schemas';
import { KeyAlgorithm } from '@/core/shared/constants';

/**
 * Input schema for account create command
 * Validates all arguments for creating a new Hedera account
 */
export const CreateAccountInputSchema = z.object({
  balance: AmountInputSchema.describe(
    'Initial HBAR balance. Format: "100" (HBAR) or "100t" (tinybars)',
  ),
  autoAssociations: z
    .number()
    .int()
    .min(0, 'Auto associations must be non-negative')
    .max(
      5000,
      'Maximum number of automatic token associations cannot exceed 5000',
    )
    .default(0)
    .describe('Maximum number of automatic token associations'),
  name: AccountNameSchema.optional().describe('Optional account name/alias'),
  payer: AccountReferenceSchema.optional().describe(
    'Optional payer account for transaction fees',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
  keyType: KeyTypeSchema.default(KeyAlgorithm.ECDSA).describe(
    'Cryptographic key type for the account',
  ),
});

export type CreateAccountInput = z.infer<typeof CreateAccountInputSchema>;
