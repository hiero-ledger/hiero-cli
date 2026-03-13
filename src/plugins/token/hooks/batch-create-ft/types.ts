import { z } from 'zod';

import { NetworkSchema, SupplyTypeSchema } from '@/core/schemas/common-schemas';
import { keyManagerNameSchema } from '@/core/services/kms/kms-types.interface';
import { HederaTokenType } from '@/core/shared/constants';

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

const ResolvedAccountCredentialSchema = z.object({
  keyRefId: z.string(),
  accountId: z.string(),
  publicKey: z.string(),
});

const ResolvedPublicKeySchema = z.object({
  keyRefId: z.string(),
  publicKey: z.string(),
});

export const CreateFtNormalizedParamsSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  initialSupply: z.bigint({ coerce: true }),
  supplyType: SupplyTypeSchema,
  alias: z.string().optional(),
  memo: z.string().optional(),
  tokenType: z.enum([
    HederaTokenType.NON_FUNGIBLE_TOKEN,
    HederaTokenType.FUNGIBLE_COMMON,
  ]),
  network: NetworkSchema,
  keyManager: keyManagerNameSchema,
  treasury: ResolvedAccountCredentialSchema,
  admin: ResolvedAccountCredentialSchema,
  supply: ResolvedPublicKeySchema.optional(),
});
