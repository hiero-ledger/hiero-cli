import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const TokenClaimAirdropInputSchema = z.object({
  account: EntityReferenceSchema.describe(
    'Receiver account ID or alias to claim airdrops for',
  ),
  index: z
    .array(z.coerce.number().int().min(1))
    .min(1)
    .describe('1-based index(es) from the pending-airdrops list'),
  from: KeySchema.optional(),
  keyManager: KeyManagerTypeSchema.optional(),
});

export type TokenClaimAirdropInput = z.infer<
  typeof TokenClaimAirdropInputSchema
>;
