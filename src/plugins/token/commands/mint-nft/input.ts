import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
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
  supplyKey: KeySchema.describe('Supply key. Accepts any key format.'),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenMintNftInput = z.infer<typeof TokenMintNftInputSchema>;
