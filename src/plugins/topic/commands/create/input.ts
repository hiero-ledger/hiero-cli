import { z } from 'zod';

import {
  KeyManagerTypeSchema,
  KeyThresholdOptionalSchema,
  MemoSchema,
  OptionalDefaultEmptyKeyListSchema,
  TopicNameSchema,
} from '@/core/schemas';
import { applyKeyThresholdSuperRefine } from '@/core/utils/key-threshold-input-schema';

/**
 * Input schema for topic create command
 * Validates arguments for creating a new Hedera topic
 */
const topicCreateInputObjectSchema = z.object({
  memo: MemoSchema.describe('Optional memo for the topic'),
  adminKey: OptionalDefaultEmptyKeyListSchema.describe(
    'Admin key(s). Pass multiple times for multiple keys. Format: {accountId}:{privateKey}, private key in {ed25519|ecdsa}:private:{key} format, key reference or account alias',
  ),
  submitKey: OptionalDefaultEmptyKeyListSchema.describe(
    'Submit key(s). Pass multiple times for multiple keys. Format: {accountId}:{privateKey}, public/private key in {ed25519|ecdsa}:public|private:{key} format, key reference or account alias',
  ),
  adminKeyThreshold: KeyThresholdOptionalSchema.describe(
    'Number of admin keys required to sign (M-of-N)',
  ),
  submitKeyThreshold: KeyThresholdOptionalSchema.describe(
    'Number of submit keys required to sign (M-of-N)',
  ),
  name: TopicNameSchema.optional().describe(
    'Optional name/alias for the topic',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type for storing private keys (defaults to config setting)',
  ),
});

export const TopicCreateInputSchema = topicCreateInputObjectSchema.superRefine(
  (data, context) => {
    applyKeyThresholdSuperRefine(data, context, [
      {
        thresholdField: 'adminKeyThreshold',
        getKeyCount: (row) => row.adminKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'adminKeyThreshold can only be set when multiple admin keys are provided',
          thresholdExceedsKeyCount:
            'adminKeyThreshold must not exceed the number of admin keys provided',
        },
      },
      {
        thresholdField: 'submitKeyThreshold',
        getKeyCount: (row) => row.submitKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'submitKeyThreshold can only be set when multiple submit keys are provided',
          thresholdExceedsKeyCount:
            'submitKeyThreshold must not exceed the number of submit keys provided',
        },
      },
    ]);
  },
);

export type TopicCreateInput = z.infer<typeof TopicCreateInputSchema>;
