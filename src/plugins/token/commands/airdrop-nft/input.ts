import { z } from 'zod';

import {
  AccountReferenceSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
  NftSerialNumbersSchema,
} from '@/core/schemas';

export const TokenAirdropNftInputSchema = z
  .object({
    token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
    to: z
      .array(AccountReferenceSchema)
      .min(1)
      .describe(
        'Destination account(s) (ID, EVM address, or name). Pass multiple times for multiple recipients.',
      ),
    serials: z
      .array(NftSerialNumbersSchema)
      .min(1)
      .describe(
        'Serial numbers per recipient (comma-separated). Index-mapped to --to. Pass multiple times for multiple recipients.',
      ),
    from: KeySchema.optional().describe(
      'Source account. Accepts any key format. Defaults to operator.',
    ),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager type (defaults to config setting)',
    ),
  })
  .superRefine((data, ctx) => {
    if (data.to.length !== data.serials.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Number of --to flags (${data.to.length}) must match number of --serials flags (${data.serials.length})`,
        path: ['serials'],
      });
      return;
    }

    const allSerials = data.serials.flat();

    const seen = new Set<number>();
    const duplicates: number[] = [];
    for (const serial of allSerials) {
      if (seen.has(serial)) {
        duplicates.push(serial);
      } else {
        seen.add(serial);
      }
    }

    if (duplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate serial numbers across recipients: ${duplicates.join(', ')}`,
        path: ['serials'],
      });
    }
  });

export type TokenAirdropNftInput = z.infer<typeof TokenAirdropNftInputSchema>;
