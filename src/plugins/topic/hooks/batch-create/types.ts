import { z } from 'zod';

import { SupportedNetwork } from '@/core/types/shared.types';

export interface BatchDataItem {
  transactionBytes: string;
  order: number;
  command: string;
  normalizedParams: Record<string, unknown>;
  transactionId?: string;
}

export interface BatchData {
  name: string;
  keyRefId: string;
  executed: boolean;
  success: boolean;
  transactions: BatchDataItem[];
}

export interface BatchExecuteTransactionResult {
  updatedBatchData: BatchData;
}

const ResolvedPublicKeySchema = z.object({
  keyRefId: z.string(),
  publicKey: z.string(),
});

export const TopicCreateNormalisedParamsSchema = z.object({
  memo: z.string().optional(),
  alias: z.string().optional(),
  keyManager: z.string(),
  network: z.enum(SupportedNetwork),
  adminKey: ResolvedPublicKeySchema.optional(),
  submitKey: ResolvedPublicKeySchema.optional(),
});
