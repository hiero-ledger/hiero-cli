import { z } from 'zod';

import { ResolvedPublicKeySchema } from '@/core';
import { SupportedNetwork } from '@/core/types/shared.types';

export const TopicCreateNormalisedParamsSchema = z.object({
  memo: z.string().optional(),
  alias: z.string().optional(),
  keyManager: z.string(),
  network: z.enum(SupportedNetwork),
  adminKey: ResolvedPublicKeySchema.optional(),
  submitKey: ResolvedPublicKeySchema.optional(),
});
