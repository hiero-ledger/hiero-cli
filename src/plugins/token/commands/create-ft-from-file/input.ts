import { z } from 'zod';

import { FilePathSchema, KeyManagerTypeSchema } from '@/core/schemas';

/**
 * Input schema for token create-from-file command
 * Validates arguments for creating a token from a JSON file definition
 */
export const CreateFungibleTokenFromFileInputSchema = z.object({
  file: FilePathSchema.describe(
    'Filesystem path to JSON file containing token definition',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type CreateFungibleTokenFromFileInput = z.infer<
  typeof CreateFungibleTokenFromFileInputSchema
>;
