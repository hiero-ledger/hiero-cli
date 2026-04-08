import { z } from 'zod';

import { KeyTypeSchema, NetworkSchema } from '@/core';

export const AccountCreateNormalisedParamsSchema = z.object({
  maxAutoAssociations: z.number(),
  alias: z.string().optional(),
  name: z.string().optional(),
  publicKey: z.string(),
  keyRefId: z.string(),
  keyType: KeyTypeSchema,
  network: NetworkSchema,
});
