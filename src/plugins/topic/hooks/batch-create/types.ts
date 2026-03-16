import { z } from 'zod';

import { SupportedNetwork } from '@/core/types/shared.types';

const ResolvedPublicKeySchema = z.object({
  keyRefId: z.string(),
  publicKey: z.string(),
});

export const TopicCreateNormalisedParamsSchema = z.object({
  memo: z.string().optional(),
  alias: z.string().optional(),
  keyManager: z.string(),
  network: z.enum(SupportedNetwork),
  adminKey: ResolvedPublicKeySchema.optional(),
  submitKey: ResolvedPublicKeySchema.optional(),
});
