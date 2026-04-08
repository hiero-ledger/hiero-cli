import { z } from 'zod';

import {
  AccountReferenceSchema,
  EntityReferenceSchema,
  IsoTimestampSchema,
  KeyManagerTypeSchema,
  KeySchema,
  KeyThresholdSchema,
  MemoSchema,
  NullLiteralSchema,
} from '@/core/schemas';
import { NULL_TOKEN } from '@/core/shared/constants';
import { applyKeyThresholdSuperRefine } from '@/core/utils/key-threshold-input-schema';

const topicUpdateInputObjectSchema = z.object({
  topic: EntityReferenceSchema.describe('Topic ID or alias to update'),
  memo: MemoSchema.or(NullLiteralSchema)
    .optional()
    .describe('New memo for the topic. Pass "null" to clear.'),
  adminKey: z
    .array(KeySchema)
    .optional()
    .default([])
    .describe('New admin key(s). Cannot be cleared, only replaced.'),
  submitKey: z
    .array(KeySchema)
    .or(NullLiteralSchema)
    .optional()
    .default([])
    .describe('New submit key(s). Pass "null" to clear.'),
  adminKeyThreshold: KeyThresholdSchema.optional().describe(
    'Number of admin keys required to sign (M-of-N)',
  ),
  submitKeyThreshold: KeyThresholdSchema.optional().describe(
    'Number of submit keys required to sign (M-of-N)',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
  autoRenewAccount: AccountReferenceSchema.or(NullLiteralSchema)
    .optional()
    .describe('Auto-renew account ID. Pass "null" to clear.'),
  autoRenewPeriod: z
    .number()
    .int()
    .positive()
    .min(
      2_592_000,
      'Auto-renew period must be at least 30 days (2592000 seconds)',
    )
    .max(
      8_000_000,
      'Auto-renew period must not exceed ~92 days (8000000 seconds)',
    )
    .describe('Auto-renew period in seconds (30–92 days)')
    .optional()
    .describe('Auto-renew period in seconds'),
  expirationTime: IsoTimestampSchema.optional().describe(
    'Expiration time as ISO datetime string',
  ),
});

export const TopicUpdateInputSchema = topicUpdateInputObjectSchema.superRefine(
  (data, context) => {
    const submitKeys = Array.isArray(data.submitKey) ? data.submitKey : [];
    const hasAnyUpdate =
      data.memo !== undefined ||
      data.adminKey.length > 0 ||
      data.submitKey === NULL_TOKEN ||
      submitKeys.length > 0 ||
      data.autoRenewAccount !== undefined ||
      data.autoRenewPeriod !== undefined ||
      data.expirationTime !== undefined;

    if (!hasAnyUpdate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field to update must be provided',
        path: ['topic'],
      });
    }

    applyKeyThresholdSuperRefine(data, context, [
      {
        thresholdField: 'adminKeyThreshold',
        getKeyCount: (row) => row.adminKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'adminKeyThreshold requires at least 2 admin keys',
          thresholdExceedsKeyCount:
            'adminKeyThreshold must not exceed the number of admin keys provided',
        },
      },
      {
        thresholdField: 'submitKeyThreshold',
        getKeyCount: (row) => {
          const submitKey = row.submitKey;
          return Array.isArray(submitKey) ? submitKey.length : 0;
        },
        messages: {
          thresholdWithoutEnoughKeys:
            'submitKeyThreshold requires at least 2 submit keys',
          thresholdExceedsKeyCount:
            'submitKeyThreshold must not exceed the number of submit keys provided',
        },
      },
    ]);
  },
);

export type TopicUpdateInput = z.infer<typeof TopicUpdateInputSchema>;
