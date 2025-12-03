/**
 * Topic Plugin State Schema
 * Single source of truth for topic data structure and validation
 */
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Zod schema for runtime validation
export const TopicDataSchema = z.object({
  name: z
    .string()
    .max(50, 'Alias must be 50 characters or less')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Name can only contain letters, numbers, underscores, and hyphens',
    ),

  topicId: z
    .string()
    .regex(/^0\.0\.[0-9]+$/, 'Topic ID must be in format 0.0.123456'),

  memo: z.string().max(100, 'Memo must be 100 characters or less').optional(),

  adminKeyRefId: z.string().min(1, 'Key reference ID is required').optional(),

  submitKeyRefId: z.string().min(1, 'Key reference ID is required').optional(),

  autoRenewAccount: z
    .string()
    .regex(/^0\.0\.[0-9]+$/, 'Auto renew account must be in format 0.0.123456')
    .optional(),

  autoRenewPeriod: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Auto renew period in seconds'),

  expirationTime: z
    .string()
    .optional()
    .describe('Topic expiration time as ISO string'),

  network: z.enum(['mainnet', 'testnet', 'previewnet', 'localnet'], {
    errorMap: () => ({
      message: 'Network must be mainnet, testnet, or previewnet',
    }),
  }),

  createdAt: z
    .string()
    .datetime()
    .default(() => new Date().toISOString())
    .describe('Creation timestamp'),

  updatedAt: z
    .string()
    .datetime()
    .default(() => new Date().toISOString())
    .describe('Last update timestamp'),
});

// TypeScript type inferred from Zod schema
export type TopicData = z.infer<typeof TopicDataSchema>;

// Namespace constant
export const TOPIC_NAMESPACE = 'topic-topics';

// JSON Schema for manifest (automatically generated from Zod schema)
export const TOPIC_JSON_SCHEMA = zodToJsonSchema(TopicDataSchema);

/**
 * Validate topic data using Zod schema
 */
export function validateTopicData(data: unknown): data is TopicData {
  try {
    TopicDataSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse and validate topic data with detailed error messages
 */
export function parseTopicData(data: unknown): TopicData {
  return TopicDataSchema.parse(data);
}

/**
 * Safe parse topic data (returns success/error instead of throwing)
 */
export function safeParseTopicData(data: unknown) {
  return TopicDataSchema.safeParse(data);
}
