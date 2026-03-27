import { z } from 'zod';

import {
  AccountReferenceSchema,
  AmountInputSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const TokenAllowanceFtInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or alias)'),
  owner: KeySchema.describe(
    'Owner account. Accepts any key format. Defaults to operator.',
  ),
  spender: AccountReferenceSchema.describe('Spender account (ID or alias)'),
  amount: AmountInputSchema.describe(
    'Allowance amount (display units or base units with "t" suffix). Set to 0 to revoke.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenAllowanceFtInput = z.infer<typeof TokenAllowanceFtInputSchema>;
