import { z } from 'zod';

import { AccountReferenceSchema } from '@/core/schemas';

export const AccountDeleteInputSchema = z
  .object({
    account: AccountReferenceSchema.describe(
      'Account ID or alias of the account present in state',
    ),
    transferId: AccountReferenceSchema.optional().describe(
      'Account that receives remaining HBAR (Hedera ID or alias). Required when deleting on Hedera; do not use with --state-only',
    ),
    stateOnly: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.stateOnly && data.transferId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'transfer-id cannot be used with --state-only (no transfer happens on the network)',
        path: ['transferId'],
      });
    }
    if (!data.stateOnly && data.transferId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'transfer-id is required when deleting on Hedera (use --state-only to remove only from local state)',
        path: ['transferId'],
      });
    }
  });

export type AccountDeleteInput = z.infer<typeof AccountDeleteInputSchema>;
