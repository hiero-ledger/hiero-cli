import { z } from 'zod';

import { KeyManagerTypeSchema, KeySchema } from '@/core/schemas';
import { EntityReferenceSchema } from '@/core/schemas/common-schemas';

export const TokenRejectAirdropInputSchema = z.object({
  account: EntityReferenceSchema.describe(
    'Receiver account ID or alias to reject airdrops for',
  ),
  index: z
    .preprocess(
      (val) => {
        const str = typeof val === 'string' ? val : '';
        return str.split(',').map((s) => parseInt(s.trim(), 10));
      },
      z.array(z.number().int().min(1)).min(1),
    )
    .describe('1-based index(es) from the pending-airdrops list'),
  from: KeySchema.optional().describe('Signing account. Defaults to operator.'),
  keyManager: KeyManagerTypeSchema.optional(),
});

export type TokenRejectAirdropInput = z.infer<
  typeof TokenRejectAirdropInputSchema
>;
