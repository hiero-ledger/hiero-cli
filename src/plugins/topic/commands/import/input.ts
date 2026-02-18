import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas';
import { TopicNameSchema } from '@/core/schemas/common-schemas';

/**
 * Input schema for topic import command
 * Validates arguments for importing an existing topic
 */
export const ImportTopicInputSchema = z.object({
  topic: EntityIdSchema.describe('Topic ID to import (format: 0.0.xxx)'),
  name: TopicNameSchema.optional().describe(
    'Optional name/alias for the topic',
  ),
});

export type ImportTopicInput = z.infer<typeof ImportTopicInputSchema>;
