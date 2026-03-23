import { z } from 'zod';

import {
  HtsDecimalsSchema,
  KeySchema,
  MemoSchema,
  NetworkSchema,
  ResolvedAccountCredentialSchema,
  ResolvedPublicKeySchema,
  SupplyTypeSchema,
  TinybarSchema,
  TokenNameSchema,
  TokenSymbolSchema,
  TokenTypeSchema,
} from '@/core/schemas/common-schemas';
import { keyManagerNameSchema } from '@/core/services/kms/kms-types.interface';
import { TokenFileCustomFeeSchema } from '@/plugins/token/schema';

export const CreateFtFromFileNormalizedParamsSchema = z.object({
  filename: z.string(),
  name: TokenNameSchema,
  symbol: TokenSymbolSchema,
  decimals: HtsDecimalsSchema,
  initialSupply: TinybarSchema,
  maxSupply: TinybarSchema,
  supplyType: SupplyTypeSchema,
  memo: MemoSchema.default(''),
  tokenType: TokenTypeSchema,
  customFees: z
    .array(TokenFileCustomFeeSchema)
    .max(10, 'Maximum 10 custom fees allowed per token')
    .default([]),
  associations: z.array(KeySchema).default([]),
  keyManager: keyManagerNameSchema,
  network: NetworkSchema,
  treasury: ResolvedAccountCredentialSchema,
  adminKey: ResolvedPublicKeySchema.optional(),
  supplyKey: ResolvedPublicKeySchema.optional(),
  wipeKey: ResolvedPublicKeySchema.optional(),
  kycKey: ResolvedPublicKeySchema.optional(),
  freezeKey: ResolvedPublicKeySchema.optional(),
  pauseKey: ResolvedPublicKeySchema.optional(),
  feeScheduleKey: ResolvedPublicKeySchema.optional(),
  metadataKey: ResolvedPublicKeySchema.optional(),
  freezeDefault: z.boolean().default(false),
});
