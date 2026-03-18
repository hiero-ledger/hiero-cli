import { z } from 'zod';

import {
  KeyManagerTypeSchema,
  KeySchema,
  MemoSchema,
  TopicNameSchema,
} from '@/core/schemas';

/**
 * Input schema for topic create command
 * Validates arguments for creating a new Hedera topic
 */
export const TopicCreateInputSchema = z
  .object({
    memo: MemoSchema.describe('Optional memo for the topic'),
    adminKey: z
      .array(KeySchema)
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
    adminKeyThreshold: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Number of admin keys required to sign (M-of-N)'),
    submitKeyThreshold: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Number of submit keys required to sign (M-of-N)'),
    name: TopicNameSchema.optional().describe(
      'Optional name/alias for the topic',
    ),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager type for storing private keys (defaults to config setting)',
    ),
  })
  .refine(
    (data) =>
      !(data.adminKeyThreshold !== undefined && data.adminKey.length < 2),
    {
      message:
        'adminKeyThreshold can only be set when multiple admin keys are provided',
      path: ['adminKeyThreshold'],
    },
  )
  .refine(
    (data) =>
      data.adminKeyThreshold === undefined ||
      data.adminKey.length < 2 ||
      data.adminKeyThreshold <= data.adminKey.length,
    {
      message:
        'adminKeyThreshold must not exceed the number of admin keys provided',
      path: ['adminKeyThreshold'],
    },
  )
  .refine(
    (data) =>
      !(data.submitKeyThreshold !== undefined && data.submitKey.length < 2),
    {
      message:
        'submitKeyThreshold can only be set when multiple submit keys are provided',
      path: ['submitKeyThreshold'],
    },
  )
  .refine(
    (data) =>
      data.submitKeyThreshold === undefined ||
      data.submitKey.length < 2 ||
      data.submitKeyThreshold <= data.submitKey.length,
    {
      message:
        'submitKeyThreshold must not exceed the number of submit keys provided',
      path: ['submitKeyThreshold'],
    },
  );

export type TopicCreateInput = z.infer<typeof TopicCreateInputSchema>;
