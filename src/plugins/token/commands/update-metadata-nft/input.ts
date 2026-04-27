import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  NftSerialNumbersSchema,
  OptionalDefaultEmptyKeyListSchema,
} from '@/core/schemas';

export const TokenUpdateNftMetadataInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or name)'),
  serials: NftSerialNumbersSchema.describe(
    'Comma-separated serial numbers to update (max 10)',
  ),
  metadata: z
    .string()
    .min(1, 'Metadata cannot be empty')
    .describe('New NFT metadata (string, max 100 bytes)'),
  metadataKey: OptionalDefaultEmptyKeyListSchema.describe(
    "Metadata key credential(s). If omitted, resolved from key manager by matching the token's on-chain metadata key.",
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenUpdateNftMetadataInput = z.infer<
  typeof TokenUpdateNftMetadataInputSchema
>;
