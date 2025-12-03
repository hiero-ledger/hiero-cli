import { z } from 'zod';
import { EntityReferenceSchema } from '../../../../core/schemas';

/**
 * Input schema for topic submit-message command
 * Validates arguments for submitting a message to a topic
 */
export const SubmitMessageInputSchema = z.object({
  topic: EntityReferenceSchema.describe('Topic ID or topic name/alias'),
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .describe('Message to submit to the topic'),
});

export type SubmitMessageInput = z.infer<typeof SubmitMessageInputSchema>;
