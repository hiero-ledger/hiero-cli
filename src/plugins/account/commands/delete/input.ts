import { z } from 'zod';

import { AccountReferenceSchema } from '@/core/schemas';

export const DeleteAccountInputSchema = z.object({
  account: AccountReferenceSchema.describe(
    'Account ID, alias or name of the account present in state',
  ),
});

export type DeleteAccountInput = z.infer<typeof DeleteAccountInputSchema>;
