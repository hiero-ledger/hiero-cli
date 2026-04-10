import { z } from 'zod';

import {
  KeySchema,
  MemoSchema,
  NetworkSchema,
  ResolvedAccountCredentialSchema,
  ResolvedPublicKeySchema,
  SupplyTypeSchema,
  TokenNameSchema,
  TokenSymbolSchema,
} from '@/core/schemas/common-schemas';
import { keyManagerNameSchema } from '@/core/services/kms/kms-types.interface';

export const CreateNftFromFileNormalizedParamsSchema = z.object({
  filename: z.string(),
  alias: z.string().optional(),
  name: TokenNameSchema,
  symbol: TokenSymbolSchema,
  supplyType: SupplyTypeSchema,
  maxSupply: z.bigint().optional(),
  memo: MemoSchema.default(''),
  associations: z.array(KeySchema).default([]),
  keyRefIds: z.array(z.string()),
  keyManager: keyManagerNameSchema,
  network: NetworkSchema,
  treasury: ResolvedAccountCredentialSchema,
  adminKeys: z.array(ResolvedPublicKeySchema).default([]),
  adminKeyThreshold: z.number().default(0),
  supplyKeys: z.array(ResolvedPublicKeySchema).default([]),
  supplyKeyThreshold: z.number().default(0),
  wipeKeys: z.array(ResolvedPublicKeySchema).default([]),
  wipeKeyThreshold: z.number().default(0),
  kycKeys: z.array(ResolvedPublicKeySchema).default([]),
  kycKeyThreshold: z.number().default(0),
  freezeKeys: z.array(ResolvedPublicKeySchema).default([]),
  freezeKeyThreshold: z.number().default(0),
  pauseKeys: z.array(ResolvedPublicKeySchema).default([]),
  pauseKeyThreshold: z.number().default(0),
  feeScheduleKeys: z.array(ResolvedPublicKeySchema).default([]),
  feeScheduleKeyThreshold: z.number().default(0),
  metadataKeys: z.array(ResolvedPublicKeySchema).default([]),
  metadataKeyThreshold: z.number().default(0),
});
