import { z } from 'zod';

import { EntityReferenceSchema } from '@/core/schemas/common-schemas';

/**
 * Input schema for token delete command
 */
export const DeleteTokenInputSchema = z.object({
  token: EntityReferenceSchema.describe(
    'Token identifier: either a token alias or token-id',
  ),
});

export type DeleteTokenInput = z.infer<typeof DeleteTokenInputSchema>;
