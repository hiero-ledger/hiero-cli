import { z } from 'zod';

import { AccountReferenceSchema, KeySchema } from '@/core/schemas';

export const AccountDeleteInputSchema = z
  .object({
    account: z
      .string()
      .min(1, 'Account is required')
      .describe(
        'Account that signs the delete on Hedera. Accepts any supported key format (account ID, account ID:private key, key reference, alias, etc.). When using --state-only, Hedera account ID or local alias only.',
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
    const accountSchema = data.stateOnly ? AccountReferenceSchema : KeySchema;
    const accountParsed = accountSchema.safeParse(data.account);
    if (!accountParsed.success) {
      const message = data.stateOnly
        ? 'With --state-only, account must be a valid Hedera account ID or local alias'
        : (accountParsed.error.issues[0]?.message ??
          'Invalid account key format');
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ['account'],
      });
    }
  });

export type AccountDeleteInput = z.infer<typeof AccountDeleteInputSchema>;
