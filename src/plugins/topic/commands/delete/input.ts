import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const TopicDeleteInputSchema = z.object({
  topic: EntityReferenceSchema.describe(
    'Topic name or topic ID (format: 0.0.xxx)',
  ),
  stateOnly: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Remove only from local CLI state; do not submit TopicDeleteTransaction',
    ),
  adminKey: z
    .array(KeySchema)
    .optional()
    .default([])
    .describe(
      'Admin key(s) for signing when the topic is not in local state, or to override keys stored in state',
    ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager when resolving --admin-key (defaults to config)',
  ),
});

export type TopicDeleteInput = z.infer<typeof TopicDeleteInputSchema>;
