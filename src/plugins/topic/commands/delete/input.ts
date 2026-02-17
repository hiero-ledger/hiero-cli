import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas';
import { TopicNameSchema } from '@/core/schemas/common-schemas';

/**
 * Input schema for topic delete command
 * At least one of name or id must be provided
 */
export const DeleteTopicInputSchema = z
  .object({
    name: TopicNameSchema.optional().describe(
      'Topic name to delete from state',
    ),
    id: EntityIdSchema.optional().describe(
      'Topic ID to delete from state (format: 0.0.xxx)',
    ),
  })
  .refine((data) => data.name !== undefined || data.id !== undefined, {
    message: 'At least one of "name" or "id" must be provided',
    path: ['name', 'id'],
  });

export type DeleteTopicInput = z.infer<typeof DeleteTopicInputSchema>;
