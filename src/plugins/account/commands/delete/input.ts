import { z } from 'zod';

import { AccountReferenceSchema } from '@/core/schemas';

export const DeleteAccountInputSchema = z.object({
  account: AccountReferenceSchema.describe(
    'Account name or account ID to delete from state (format: 0.0.xxx)',
  ),
});

export type DeleteAccountInput = z.infer<typeof DeleteAccountInputSchema>;
