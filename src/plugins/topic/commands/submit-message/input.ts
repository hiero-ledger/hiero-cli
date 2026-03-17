import { z } from 'zod';

import {
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  PrivateKeySchema,
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
  signer: z
    .array(PrivateKeySchema)
    .optional()
    .default([])
    .describe(
      'Key(s) to sign the message with. Pass multiple times for threshold topics. Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias.',
    ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type for storing private keys (defaults to config setting)',
  ),
});

export type TopicSubmitMessageInput = z.infer<
  typeof TopicSubmitMessageInputSchema
>;
