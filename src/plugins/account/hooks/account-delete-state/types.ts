import { z } from 'zod';

import { AliasNameSchema, EntityIdSchema } from '@/core/schemas/common-schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const AccountDeleteNormalisedParamsSchema = z.object({
  network: z.enum(SupportedNetwork),
  stateKey: z.string().min(1),
  accountToDelete: z.object({
    accountId: EntityIdSchema,
    keyRefId: z.string().min(1),
    name: AliasNameSchema.max(50).optional(),
  }),
  transferAccountId: EntityIdSchema,
  accountRef: z.string(),
});
