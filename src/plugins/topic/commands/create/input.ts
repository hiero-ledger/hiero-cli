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
export const CreateTopicInputSchema = z.object({
  memo: MemoSchema.describe('Optional memo for the topic'),
  adminKey: PrivateKeySchema.optional().describe(
    'Admin key of topic. Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:{private-key} format, key reference or account alias',
  ),
  submitKey: KeySchema.optional().describe(
    'Submit key of topic. Can be {accountId}:{privateKey} pair, account ID, account public key in {ed25519|ecdsa}:{public-key} format, account private key in {ed25519|ecdsa}:{private-key} format, key reference or account alias.',
  ),
  name: TopicNameSchema.optional().describe(
    'Optional name/alias for the topic',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type for storing private keys (defaults to config setting)',
  ),
});

export type CreateTopicInput = z.infer<typeof CreateTopicInputSchema>;
