import { z } from 'zod';

import {
  AccountReferenceSchema,
  EntityReferenceSchema,
  IsoTimestampSchema,
  KeyManagerTypeSchema,
  KeySchema,
  MemoSchema,
} from '@/core/schemas';

const NULL_LITERAL = z.literal('null');

export const TopicUpdateInputSchema = z
  .object({
    topic: EntityReferenceSchema.describe('Topic ID or alias to update'),
    memo: MemoSchema.or(NULL_LITERAL)
      .optional()
      .describe('New memo for the topic. Pass "null" to clear.'),
    adminKey: z
      .array(KeySchema)
      .optional()
      .default([])
      .describe('New admin key(s). Cannot be cleared, only replaced.'),
    submitKey: z
      .array(z.string().min(1))
      .optional()
      .default([])
      .describe(
        'New submit key(s). Pass "null" to clear (makes topic public).',
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
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager type (defaults to config setting)',
    ),
    autoRenewAccount: AccountReferenceSchema.or(NULL_LITERAL)
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
      .optional()
      .describe('Auto-renew period in seconds'),
    expirationTime: IsoTimestampSchema.optional().describe(
      'Expiration time as ISO datetime string',
    ),
  })
  .refine(
    (data) =>
      data.memo !== undefined ||
      data.adminKey.length > 0 ||
      data.submitKey.length > 0 ||
      data.autoRenewAccount !== undefined ||
      data.autoRenewPeriod !== undefined ||
      data.expirationTime !== undefined,
    {
      message: 'At least one field to update must be provided',
      path: ['topic'],
    },
  )
  .refine(
    (data) =>
      !(data.adminKeyThreshold !== undefined && data.adminKey.length === 0),
    {
      message: 'adminKeyThreshold requires admin keys to be provided',
      path: ['adminKeyThreshold'],
    },
  )
  .refine(
    (data) => {
      const isClearing =
        data.submitKey.length === 1 && data.submitKey[0] === 'null';
      return !(
        data.submitKeyThreshold !== undefined &&
        !isClearing &&
        data.submitKey.length === 0
      );
    },
    {
      message: 'submitKeyThreshold requires submit keys to be provided',
      path: ['submitKeyThreshold'],
    },
  )
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
    (data) => {
      const isClearing =
        data.submitKey.length === 1 && data.submitKey[0] === 'null';
      if (isClearing) return true;
      return !(
        data.submitKeyThreshold !== undefined && data.submitKey.length < 2
      );
    },
    {
      message:
        'submitKeyThreshold can only be set when multiple submit keys are provided',
      path: ['submitKeyThreshold'],
    },
  )
  .refine(
    (data) => {
      const isClearing =
        data.submitKey.length === 1 && data.submitKey[0] === 'null';
      if (isClearing) return true;
      return (
        data.submitKeyThreshold === undefined ||
        data.submitKey.length < 2 ||
        data.submitKeyThreshold <= data.submitKey.length
      );
    },
    {
      message:
        'submitKeyThreshold must not exceed the number of submit keys provided',
      path: ['submitKeyThreshold'],
    },
  );

export type TopicUpdateInput = z.infer<typeof TopicUpdateInputSchema>;
