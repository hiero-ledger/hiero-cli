import { z } from 'zod';

import {
  AccountNameSchema,
  AccountReferenceSchema,
  AmountInputSchema,
  KeyManagerTypeSchema,
  KeySchema,
  KeyTypeSchema,
} from '@/core/schemas';

export const CreateAccountInputSchema = z
  .object({
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
    keyType: KeyTypeSchema.optional().describe(
      'Cryptographic key type for the account',
    ),
    key: KeySchema.optional().describe(
      'Existing key for the account. Formats: ecdsa|ed25519:private|public:{key}, kr_{ref}, {accountId}:{privateKey}, alias name',
    ),
  })
  .superRefine((data, ctx) => {
    if (data.key !== undefined && data.keyType !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot specify both --key and --key-type',
        path: ['keyType'],
      });
    }
  });

export type CreateAccountInput = z.infer<typeof CreateAccountInputSchema>;
