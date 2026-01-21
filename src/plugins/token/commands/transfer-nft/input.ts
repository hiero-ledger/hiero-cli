import { z } from 'zod';

import {
  AccountReferenceSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
} from '@/core/schemas';

export const TransferNftInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  to: AccountReferenceSchema.describe(
    'Destination account (ID, EVM address, or name)',
  ),
  from: KeyOrAccountAliasSchema.optional().describe(
    'Source account. Can be alias or AccountID:privateKey pair. Defaults to operator.',
  ),
  serials: z
    .string()
    .trim()
    .transform((val) => val.split(',').map((s) => parseInt(s.trim(), 10)))
    .refine((arr) => arr.length > 0, 'At least one serial number is required')
    .refine(
      (arr) => arr.every((n) => !Number.isNaN(n) && n > 0),
      'Serial numbers must be positive integers separated by commas',
    )
    .describe('NFT serial numbers (comma-separated list)'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TransferNftInput = z.infer<typeof TransferNftInputSchema>;
