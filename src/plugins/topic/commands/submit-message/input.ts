import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

/**
 * Input schema for topic submit-message command
 * Validates arguments for submitting a message to a topic
 */
export const TopicSubmitMessageInputSchema = z.object({
  topic: EntityReferenceSchema.describe('Topic ID or topic name/alias'),
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .describe('Message to submit to the topic'),
  signer: KeySchema.optional().describe(
    'Key to sign the message with. Accepts any key format.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type for storing private keys (defaults to config setting)',
  ),
});

export type TopicSubmitMessageInput = z.infer<
  typeof TopicSubmitMessageInputSchema
>;
