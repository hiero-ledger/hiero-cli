import { z } from 'zod';

import {
  AmountInputSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const HbarAllowanceInputSchema = z.object({
  amount: AmountInputSchema.refine(
    (val) => val !== '0' && val !== '0t' && !val.startsWith('0.0'),
    { message: 'Allowance amount must be greater than zero' },
  ).describe(
    'Allowance amount. Format: "10.5" (HBAR) or "1000000t" (tinybars)',
  ),
  spender: KeySchema.describe(
    'Spender account. Accepts alias, accountId, or evmAddress.',
  ),
  owner: KeySchema.optional().describe('Owner account. Defaults to operator.'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type HbarAllowanceInput = z.infer<typeof HbarAllowanceInputSchema>;
