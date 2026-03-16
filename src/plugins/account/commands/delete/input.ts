import { z } from 'zod';

import { AccountReferenceSchema } from '@/core/schemas';

export const AccountDeleteInputSchema = z.object({
  account: AccountReferenceSchema.describe(
    'Account ID or alias of the account present in state',
  ),
});

export type AccountDeleteInput = z.infer<typeof AccountDeleteInputSchema>;
