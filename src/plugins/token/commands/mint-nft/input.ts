import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
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
  supplyKey: KeyOrAccountAliasSchema.describe(
    'Supply key as account name or {accountId}:{private_key} format',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type MintNftInput = z.infer<typeof MintNftInputSchema>;
