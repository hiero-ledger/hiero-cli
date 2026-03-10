import { z } from 'zod';

import {
  EntityReferenceSchema,
  FilePathSchema,
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
} from '@/core/schemas';

/**
 * Input schema for batch airdrop command.
 *
 * Uses Hedera's native TokenAirdropTransaction which handles
 * association automatically — no need for recipients to pre-associate.
 *
 * CSV format expected:
 *   to,amount
 *   0.0.12345,100
 *   alice,50
 */
export const BatchAirdropInputSchema = z.object({
  file: FilePathSchema.describe('Path to CSV file with airdrop data'),
  token: EntityReferenceSchema.describe(
    'Token to airdrop: either a token alias or token-id',
  ),
  from: KeyOrAccountAliasSchema.optional().describe(
    'Source account for all airdrops. Can be alias or AccountID:privateKey pair. Defaults to operator.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
  dryRun: z
    .union([z.boolean(), z.string().transform((v) => v === 'true')])
    .optional()
    .default(false)
    .describe('Validate CSV without executing transactions'),
});

export type BatchAirdropInput = z.infer<typeof BatchAirdropInputSchema>;
