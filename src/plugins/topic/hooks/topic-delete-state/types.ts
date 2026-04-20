import { z } from 'zod';

import { SupportedNetwork } from '@/core/types/shared.types';
import { TopicDataSchema } from '@/plugins/topic/schema';

export const TopicDeleteNormalisedParamsSchema = z.object({
  topicRef: z.string(),
  network: z.enum(SupportedNetwork),
  key: z.string(),
  topicToDelete: TopicDataSchema,
  stateOnly: z.boolean(),
  signingKeyRefIds: z.array(z.string()).optional(),
});
