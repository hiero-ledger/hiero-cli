import { z } from 'zod';

import { KeyAlgorithm, SupportedNetwork } from '@/core';

export const AccountCreateNormalisedParamsSchema = z.object({
  maxAutoAssociations: z.number(),
  alias: z.string().optional(),
  name: z.string().optional(),
  publicKey: z.string(),
  keyRefId: z.string(),
  keyType: z.enum(KeyAlgorithm),
  network: z.enum(SupportedNetwork),
});
