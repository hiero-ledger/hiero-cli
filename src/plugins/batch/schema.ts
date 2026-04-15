/**
 * Batch Plugin State Schema
 * Single source of truth for batch data structure and validation
 */
import type { z } from 'zod';
import type { BatchTransactionItemSchema } from '@/core';

import { BatchDataSchema } from '@/core';

// TypeScript types inferred from Zod schemas
export type BatchItem = z.infer<typeof BatchTransactionItemSchema>;
export type BatchData = z.infer<typeof BatchDataSchema>;

/**
 * Safe parse batch data (returns success/error instead of throwing)
 */
export function safeParseBatchData(data: unknown) {
  return BatchDataSchema.safeParse(data);
}
