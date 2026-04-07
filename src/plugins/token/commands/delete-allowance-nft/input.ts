import { z } from 'zod';

import {
  AccountReferenceSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
  NftSerialNumbersSchema,
} from '@/core/schemas';

export const TokenDeleteAllowanceNftInputSchema = z
  .object({
    token: EntityReferenceSchema.describe('NFT token (ID or alias)'),
    owner: KeySchema.optional().describe(
      'Owner account. Accepts any key format. Defaults to operator.',
    ),
    serials: NftSerialNumbersSchema.optional().describe(
      'Specific NFT serial numbers to delete allowance for. Mutually exclusive with --all-serials.',
    ),
    allSerials: z
      .boolean()
      .default(false)
      .describe(
        'Revoke all-serials blanket approval for a specific spender. Mutually exclusive with --serials.',
      ),
    spender: AccountReferenceSchema.optional().describe(
      'Spender account (ID, EVM address, or alias). Required with --all-serials, not used with --serials.',
    ),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager type (defaults to config setting)',
    ),
  })
  .superRefine((data, ctx) => {
    if (!data.serials && !data.allSerials) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either --serials or --all-serials must be specified',
      });
    }
    if (data.serials && data.allSerials) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '--serials and --all-serials are mutually exclusive',
      });
    }
    if (data.allSerials && !data.spender) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '--spender is required when using --all-serials',
      });
    }
    if (data.serials && data.spender) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          '--spender is not used with --serials (allowance is deleted for all spenders)',
      });
    }
  });

export type TokenDeleteAllowanceNftInput = z.infer<
  typeof TokenDeleteAllowanceNftInputSchema
>;
