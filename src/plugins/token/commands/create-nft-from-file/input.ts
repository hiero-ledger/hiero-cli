import { z } from 'zod';

import { FilePathSchema, KeyManagerTypeSchema } from '@/core/schemas';

export const TokenCreateNftFromFileInputSchema = z.object({
  file: FilePathSchema.describe(
    'Filesystem path to JSON file containing NFT token definition',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenCreateNftFromFileInput = z.infer<
  typeof TokenCreateNftFromFileInputSchema
>;
