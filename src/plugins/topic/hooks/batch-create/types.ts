import { z } from 'zod';

import { ResolvedPublicKeySchema } from '@/core';
import { SupportedNetwork } from '@/core/types/shared.types';

export const TopicCreateNormalisedParamsSchema = z.object({
  memo: z.string().optional(),
  alias: z.string().optional(),
  keyManager: z.string(),
  network: z.enum(SupportedNetwork),
  adminKeys: z.array(ResolvedPublicKeySchema).default([]),
  submitKeys: z.array(ResolvedPublicKeySchema).default([]),
  adminKeyThreshold: z.number().int().min(0).default(0),
  submitKeyThreshold: z.number().int().min(0).default(0),
});
