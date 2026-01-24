/**
 * Batch Plugin Schema Definitions
 * Defines state schemas for batch operation tracking
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  IsoTimestampSchema,
  NetworkSchema,
} from '@/core/schemas/common-schemas';
import { zodToJsonSchema } from '@/core/utils/zod-to-json-schema';

// Batch operation status
export const BatchStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'partial',
]);
export type BatchStatus = z.infer<typeof BatchStatusSchema>;

// Individual transfer result
export const TransferResultSchema = z.object({
  index: z.number().int().nonnegative(),
  toAccountId: EntityIdSchema,
  amount: z.string(),
  status: z.enum(['success', 'failed', 'skipped']),
  transactionId: z.string().optional(),
  error: z.string().optional(),
});
export type TransferResult = z.infer<typeof TransferResultSchema>;

// Batch operation record
export const BatchOperationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['hbar-transfer', 'token-transfer']),
  network: NetworkSchema,
  status: BatchStatusSchema,
  totalOperations: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  sourceFile: z.string().optional(),
  tokenId: EntityIdSchema.optional(),
  results: z.array(TransferResultSchema),
  createdAt: IsoTimestampSchema,
  completedAt: IsoTimestampSchema.optional(),
});
export type BatchOperation = z.infer<typeof BatchOperationSchema>;

// State namespace and JSON schema
export const BATCH_NAMESPACE = 'batch-operations';
export const BATCH_JSON_SCHEMA = zodToJsonSchema(BatchOperationSchema);
