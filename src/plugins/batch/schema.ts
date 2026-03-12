/**
 * Batch Plugin State Schema
 * Single source of truth for batch data structure and validation
 */
import { z } from 'zod';

import { AliasNameSchema } from '@/core/schemas/common-schemas';

/** Schema for a single batch list item */
export const BatchTransactionItemSchema = z.object({
  transactionBytes: z.string().min(1).describe('Transaction raw bytes'),
  order: z
    .number()
    .int()
    .describe('Order of inner transaction in batch transaction'),
  command: z.string().min(1).describe('Name of the command entry point'),
  normalizedParams: z
    .record(z.string(), z.unknown())
    .default({})
    .describe(
      'Normalized params from the command that produced this transaction',
    ),
});

// Zod schema for runtime validation
// Minimal schema - user will add proper fields later
export const BatchDataSchema = z.object({
  name: AliasNameSchema,
  keyRefId: z.string().min(1, 'Key reference ID is required'),
  executed: z.boolean().default(false).describe('Batch executed'),
  success: z.boolean().default(false).describe('Batch execution success'),
  transactions: z
    .array(BatchTransactionItemSchema)
    .default([])
    .describe('Inner transactions for a batch'),
});

// TypeScript types inferred from Zod schemas
export type BatchItem = z.infer<typeof BatchTransactionItemSchema>;
export type BatchData = z.infer<typeof BatchDataSchema>;

/**
 * Safe parse batch data (returns success/error instead of throwing)
 */
export function safeParseBatchData(data: unknown) {
  return BatchDataSchema.safeParse(data);
}
