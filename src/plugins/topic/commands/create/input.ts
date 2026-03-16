import { z } from 'zod';

import {
  KeyManagerTypeSchema,
  KeySchema,
  MemoSchema,
  PrivateKeySchema,
  TopicNameSchema,
} from '@/core/schemas';

/**
 * Input schema for topic create command
 * Validates arguments for creating a new Hedera topic
 */
export const TopicCreateInputSchema = z.object({
  memo: MemoSchema.describe('Optional memo for the topic'),
  adminKey: z
    .array(PrivateKeySchema)
    .optional()
    .default([])
    .describe(
      'Admin key(s). Pass multiple times for multiple keys. Format: {accountId}:{privateKey}, private key in {ed25519|ecdsa}:private:{key} format, key reference or account alias',
    ),
  submitKey: z
    .array(KeySchema)
    .optional()
    .default([])
    .describe(
      'Submit key(s). Pass multiple times for multiple keys. Format: {accountId}:{privateKey}, public/private key in {ed25519|ecdsa}:public|private:{key} format, key reference or account alias',
    ),
  name: TopicNameSchema.optional().describe(
    'Optional name/alias for the topic',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type for storing private keys (defaults to config setting)',
  ),
});

export type TopicCreateInput = z.infer<typeof TopicCreateInputSchema>;
