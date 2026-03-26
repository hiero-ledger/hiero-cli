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
  TopicAutoRenewPeriodSchema,
} from '@/core/schemas';

export const TopicUpdateInputSchema = z
  .object({
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
    autoRenewPeriod: TopicAutoRenewPeriodSchema.optional().describe(
      'Auto-renew period in seconds',
    ),
    expirationTime: IsoTimestampSchema.optional().describe(
      'Expiration time as ISO datetime string',
    ),
  })
  .superRefine((data, ctx) => {
    const submitKeys = Array.isArray(data.submitKey) ? data.submitKey : [];
    const hasAnyUpdate =
      data.memo !== undefined ||
      data.adminKey.length > 0 ||
      data.submitKey === 'null' ||
      submitKeys.length > 0 ||
      data.autoRenewAccount !== undefined ||
      data.autoRenewPeriod !== undefined ||
      data.expirationTime !== undefined;

    if (!hasAnyUpdate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field to update must be provided',
        path: ['topic'],
      });
    }

    if (data.adminKeyThreshold !== undefined) {
      if (data.adminKey.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'adminKeyThreshold requires at least 2 admin keys',
          path: ['adminKeyThreshold'],
        });
      } else if (data.adminKeyThreshold > data.adminKey.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'adminKeyThreshold must not exceed the number of admin keys provided',
          path: ['adminKeyThreshold'],
        });
      }
    }

    if (data.submitKeyThreshold !== undefined) {
      if (submitKeys.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'submitKeyThreshold requires at least 2 submit keys',
          path: ['submitKeyThreshold'],
        });
      } else if (data.submitKeyThreshold > submitKeys.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'submitKeyThreshold must not exceed the number of submit keys provided',
          path: ['submitKeyThreshold'],
        });
      }
    }
  });

export type TopicUpdateInput = z.infer<typeof TopicUpdateInputSchema>;
