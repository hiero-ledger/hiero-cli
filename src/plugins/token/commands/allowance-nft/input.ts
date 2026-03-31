import { z } from 'zod';

import {
  AccountReferenceSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
  NftSerialNumbersSchema,
} from '@/core/schemas';

export const TokenAllowanceNftInputSchema = z
  .object({
    token: EntityReferenceSchema.describe('NFT token (ID or alias)'),
    spender: AccountReferenceSchema.describe(
      'Spender account (ID, EVM address, or alias)',
    ),
    owner: KeySchema.optional().describe(
      'Owner account. Accepts any key format. Defaults to operator.',
    ),
    serials: NftSerialNumbersSchema.optional().describe(
      'Specific NFT serial numbers to approve. Mutually exclusive with --all-serials.',
    ),
    allSerials: z
      .boolean()
      .optional()
      .describe(
        'Approve all serials in the collection. Mutually exclusive with --serials.',
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
  });

export type TokenAllowanceNftInput = z.infer<
  typeof TokenAllowanceNftInputSchema
>;
