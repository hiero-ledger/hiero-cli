import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  PrivateKeySchema,
} from '@/core/schemas';

/**
 * Input schema for mint-nft command
 * Validates arguments for minting a new NFT
 */
export const MintNftInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  metadata: z
    .string()
    .min(1, 'Metadata cannot be empty')
    .describe('NFT metadata (string, max 100 bytes)'),
  supplyKey: PrivateKeySchema.describe(
    'Supply key. Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:{private-key} format, key reference or account alias.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type MintNftInput = z.infer<typeof MintNftInputSchema>;
