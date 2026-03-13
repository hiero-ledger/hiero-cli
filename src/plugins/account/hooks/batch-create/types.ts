import { z } from 'zod';

import { KeyAlgorithm, SupportedNetwork } from '@/core';

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

export const AccountCreateNormalisedParamsSchema = z.object({
  maxAutoAssociations: z.number(),
  alias: z.string().optional(),
  name: z.string().optional(),
  publicKey: z.string(),
  keyRefId: z.string(),
  keyType: z.enum(KeyAlgorithm),
  network: z.enum(SupportedNetwork),
});
