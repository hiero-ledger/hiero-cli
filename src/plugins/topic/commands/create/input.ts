import { z } from 'zod';
import {
  KeyOrAccountSchema,
  KeyManagerTypeSchema,
  MemoSchema,
  TopicNameSchema,
} from '../../../../core/schemas';

/**
 * Input schema for topic create command
 * Validates arguments for creating a new Hedera topic
 */
export const CreateTopicInputSchema = z.object({
  memo: MemoSchema.describe('Optional memo for the topic'),
  adminKey: KeyOrAccountSchema.optional().describe(
    'Admin key as private key (with optional key type prefix: ed25519: or ecdsa:) or account name/alias',
  ),
  submitKey: KeyOrAccountSchema.optional().describe(
    'Submit key as private key (with optional key type prefix: ed25519: or ecdsa:) or account name/alias',
  ),
  name: TopicNameSchema.optional().describe(
    'Optional name/alias for the topic',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type for storing private keys (defaults to config setting)',
  ),
});

export type CreateTopicInput = z.infer<typeof CreateTopicInputSchema>;
