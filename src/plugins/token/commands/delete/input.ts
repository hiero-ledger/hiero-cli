import { z } from 'zod';

import { TokenReferenceObjectSchema } from '@/core/schemas/common-schemas';

/**
 * Input schema for token delete command
 */
export const DeleteTokenInputSchema = z.object({
  token: TokenReferenceObjectSchema.describe(
    'Token identifier: either a token alias or token-id',
  ),
});

export type DeleteTokenInput = z.infer<typeof DeleteTokenInputSchema>;
