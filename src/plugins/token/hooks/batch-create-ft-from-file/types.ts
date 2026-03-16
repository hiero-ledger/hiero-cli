import { z } from 'zod';

import {
  HtsDecimalsSchema,
  KeySchema,
  MemoSchema,
  NetworkSchema,
  PrivateKeySchema,
  PrivateKeyWithAccountIdSchema,
  ResolvedAccountCredentialSchema,
  ResolvedPublicKeySchema,
  TinybarSchema,
  TokenNameSchema,
  TokenSymbolSchema,
  TokenTypeSchema,
} from '@/core/schemas/common-schemas';
import { keyManagerNameSchema } from '@/core/services/kms/kms-types.interface';
import { TokenFileCustomFeeSchema } from '@/plugins/token/schema';

export const FungibleTokenFileSchema = z.object({
  name: TokenNameSchema,
  symbol: TokenSymbolSchema,
  decimals: HtsDecimalsSchema,
  supplyType: z.union([z.literal('finite'), z.literal('infinite')]),
  initialSupply: TinybarSchema,
  maxSupply: TinybarSchema,
  treasuryKey: PrivateKeyWithAccountIdSchema,
  adminKey: PrivateKeySchema,
  supplyKey: KeySchema.optional(),
  wipeKey: KeySchema.optional(),
  kycKey: KeySchema.optional(),
  freezeKey: KeySchema.optional(),
  pauseKey: KeySchema.optional(),
  feeScheduleKey: KeySchema.optional(),
  associations: z.array(PrivateKeyWithAccountIdSchema).default([]),
  customFees: z
    .array(TokenFileCustomFeeSchema)
    .max(10, 'Maximum 10 custom fees allowed per token')
    .default([]),
  memo: MemoSchema.default(''),
  tokenType: TokenTypeSchema,
});

export const CreateFtFromFileNormalizedParamsSchema = z.object({
  keyManager: keyManagerNameSchema,
  tokenDefinition: FungibleTokenFileSchema,
  network: NetworkSchema,
  treasury: ResolvedAccountCredentialSchema,
  adminKey: ResolvedPublicKeySchema,
  supplyKey: ResolvedPublicKeySchema.optional(),
  wipeKey: ResolvedPublicKeySchema.optional(),
  kycKey: ResolvedPublicKeySchema.optional(),
  freezeKey: ResolvedPublicKeySchema.optional(),
  pauseKey: ResolvedPublicKeySchema.optional(),
  feeScheduleKey: ResolvedPublicKeySchema.optional(),
});
