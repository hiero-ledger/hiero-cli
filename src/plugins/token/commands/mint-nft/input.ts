import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  OptionalDefaultEmptyKeyListSchema,
} from '@/core/schemas';

/**
 * Input schema for mint-nft command
 * Validates arguments for minting a new NFT
 */
export const TokenMintNftInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  metadata: z
    .string()
    .min(1, 'Metadata cannot be empty')
    .describe('NFT metadata (string, max 100 bytes)'),
  supplyKey: OptionalDefaultEmptyKeyListSchema.describe(
    'Credential(s) that can sign as the token supply. Pass multiple times when the supply policy requires more than one signature (M-of-N). Same formats as other CLI key options.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenMintNftInput = z.infer<typeof TokenMintNftInputSchema>;
