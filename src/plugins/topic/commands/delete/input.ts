import { z } from 'zod';

import { EntityReferenceSchema } from '@/core/schemas';

export const TopicDeleteInputSchema = z.object({
  topic: EntityReferenceSchema.describe(
    'Topic name or topic ID to delete from state (format: 0.0.xxx)',
  ),
});

export type TopicDeleteInput = z.infer<typeof TopicDeleteInputSchema>;
