import { z } from 'zod';

import { TokenReferenceObjectSchema } from '@/core/schemas/common-schemas';

/**
 * Input schema for token delete command
 */
export const TokenDeleteInputSchema = z.object({
  token: TokenReferenceObjectSchema.describe(
    'Token identifier: either a token alias or token-id',
  ),
});

export type TokenDeleteInput = z.infer<typeof TokenDeleteInputSchema>;
