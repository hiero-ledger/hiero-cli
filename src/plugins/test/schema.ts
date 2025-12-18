/**
 * Token Plugin State Schema
 * Single source of truth for token data structure and validation
 */
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { AliasNameSchema } from '@/core/schemas';

// Main token data schema
export const MemoDataSchema = z.object({
  account: AliasNameSchema,
  memo: z
    .string()
    .trim()
    .min(1, 'Memo is required')
    .max(100, 'Memo should have maximum of 100 characters'),
});

// TypeScript type inferred from Zod schema
export type MemoData = z.infer<typeof MemoDataSchema>;

// Namespace constant
export const MEMO_NAMESPACE = 'memo-memos';

// JSON Schema for manifest (automatically generated from Zod schema)
export const MEMO_JSON_SCHEMA = zodToJsonSchema(MemoDataSchema);

/**
 * Safe parse memo data (returns success/error instead of throwing)
 */
export function safeParseMemoData(data: unknown) {
  return MemoDataSchema.safeParse(data);
}
