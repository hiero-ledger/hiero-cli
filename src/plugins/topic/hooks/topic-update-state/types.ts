import { z } from 'zod';

import { ResolvedPublicKeySchema } from '@/core';
import { SupportedNetwork } from '@/core/types/shared.types';
import { TopicDataSchema } from '@/plugins/topic/schema';

export const TopicUpdateNormalisedParamsSchema = z.object({
  topicId: z.string(),
  stateKey: z.string(),
  network: z.enum(SupportedNetwork),
  existingTopicData: TopicDataSchema,
  memo: z.string().nullable().optional(),
  newAdminKeys: z.array(ResolvedPublicKeySchema).optional(),
  newAdminKeyThreshold: z.number().int().optional(),
  newSubmitKeys: z.array(ResolvedPublicKeySchema).nullable().optional(),
  newSubmitKeyThreshold: z.number().int().optional(),
  autoRenewAccountId: z.string().nullable().optional(),
  autoRenewPeriod: z.number().int().optional(),
  expirationTime: z.string().optional(),
});
