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
  adminKey: ResolvedPublicKeySchema,
  supplyKey: ResolvedPublicKeySchema,
  wipeKey: ResolvedPublicKeySchema.optional(),
  kycKey: ResolvedPublicKeySchema.optional(),
  freezeKey: ResolvedPublicKeySchema.optional(),
  pauseKey: ResolvedPublicKeySchema.optional(),
  feeScheduleKey: ResolvedPublicKeySchema.optional(),
});
