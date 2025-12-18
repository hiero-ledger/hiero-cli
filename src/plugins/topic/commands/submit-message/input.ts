import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
} from '@/core/schemas';

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
  signer: KeyOrAccountAliasSchema.optional().describe(
    'Account to use for signing the message. Required for public topics (without submit keys). For topics with submit keys, must be one of the authorized signers.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type for storing private keys (defaults to config setting)',
  ),
});

export type SubmitMessageInput = z.infer<typeof SubmitMessageInputSchema>;
