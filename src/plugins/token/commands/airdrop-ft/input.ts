import { z } from 'zod';

import {
  AccountReferenceSchema,
  AmountInputSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const TokenAirdropFtInputSchema = z
  .object({
    token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
    to: z
      .array(AccountReferenceSchema)
      .min(1)
      .describe(
        'Destination account(s) (ID, EVM address, or name). Pass multiple times for multiple recipients.',
      ),
    from: KeySchema.optional().describe(
      'Source account. Accepts any key format. Defaults to operator.',
    ),
    amount: z
      .array(AmountInputSchema)
      .min(1)
      .describe(
        'Amount(s) to airdrop. Index-mapped to --to. Display units by default; append "t" for base units.',
      ),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager type (defaults to config setting)',
    ),
  })
  .superRefine((data, ctx) => {
    if (data.to.length !== data.amount.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Number of --to flags (${data.to.length}) must match number of --amount flags (${data.amount.length})`,
        path: ['amount'],
      });
    }
  });

export type TokenAirdropFtInput = z.infer<typeof TokenAirdropFtInputSchema>;
