import { z } from 'zod';

import {
  AmountInputSchema,
  KeyManagerTypeSchema,
  KeySchema,
  MemoSchema,
} from '@/core/schemas';

/**
 * Input schema for hbar transfer command
 * Validates arguments for transferring HBAR between accounts
 */
export const HbarTransferInputSchema = z.object({
  amount: AmountInputSchema.refine(
    (val) => {
      // Check if value is "0" or "0t"
      return val !== '0' && val !== '0t' && !val.startsWith('0.0');
    },
    {
      message: 'Transfer amount must be greater than zero',
    },
  ).describe('Amount to transfer. Format: "100" (HBAR) or "100t" (tinybars)'),
  to: KeySchema.describe('Destination account. Accepts any key format.'),
  from: KeySchema.optional().describe(
    'Source account. Accepts any key format. Defaults to operator.',
  ),
  memo: MemoSchema.describe('Optional memo for the transfer'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type HbarTransferInput = z.infer<typeof HbarTransferInputSchema>;
