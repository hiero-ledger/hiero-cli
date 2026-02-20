import { z } from 'zod';

import {
  EntityReferenceSchema,
  FilePathSchema,
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
} from '@/core/schemas';

/**
 * Input schema for batch mint-nft command.
 *
 * CSV format expected:
 *   metadata
 *   https://example.com/nft/1.json
 *   https://example.com/nft/2.json
 */
export const BatchMintNftInputSchema = z.object({
  file: FilePathSchema.describe(
    'Path to CSV file with NFT metadata (one per row)',
  ),
  token: EntityReferenceSchema.describe(
    'NFT token collection: either a token alias or token-id',
  ),
  supplyKey: KeyOrAccountAliasSchema.describe(
    'Supply key as account name or {accountId}:{private_key} format',
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

export type BatchMintNftInput = z.infer<typeof BatchMintNftInputSchema>;
