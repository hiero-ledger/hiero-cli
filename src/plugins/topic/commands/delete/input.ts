import { z } from 'zod';

import { EntityReferenceSchema } from '@/core/schemas';

export const DeleteTopicInputSchema = z.object({
  topic: EntityReferenceSchema.describe(
    'Topic name or topic ID to delete from state (format: 0.0.xxx)',
  ),
});

export type DeleteTopicInput = z.infer<typeof DeleteTopicInputSchema>;
