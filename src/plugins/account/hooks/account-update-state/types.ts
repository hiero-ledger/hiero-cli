import { z } from 'zod';

import { KeyAlgorithm, SupportedNetwork } from '@/core';

export const AccountUpdateNormalisedParamsSchema = z.object({
  accountId: z.string(),
  network: z.enum(SupportedNetwork),
  accountStateKey: z.string(),
  newPublicKey: z.string().optional(),
  newKeyRefId: z.string().optional(),
  newKeyType: z.enum(KeyAlgorithm).optional(),
});

export type AccountUpdateNormalisedParams = z.infer<
  typeof AccountUpdateNormalisedParamsSchema
>;
