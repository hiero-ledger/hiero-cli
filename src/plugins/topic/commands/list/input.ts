import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas';

/**
 * Input schema for topic list command
 * Validates arguments for listing topics
 */
export const TopicListInputSchema = z.object({
  network: NetworkSchema.optional().describe('Filter topics by network name'),
});

export type TopicListInput = z.infer<typeof TopicListInputSchema>;
