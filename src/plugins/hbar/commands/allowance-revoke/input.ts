import { z } from 'zod';

import { KeyManagerTypeSchema, KeySchema } from '@/core/schemas';

export const HbarAllowanceRevokeInputSchema = z.object({
  spender: KeySchema.describe(
    'Spender account. Accepts alias, accountId, or evmAddress.',
  ),
  owner: KeySchema.optional().describe('Owner account. Defaults to operator.'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type HbarAllowanceRevokeInput = z.infer<
  typeof HbarAllowanceRevokeInputSchema
>;
