import { z } from 'zod';

import {
  NetworkSchema,
  ResolvedAccountCredentialSchema,
  ResolvedPublicKeySchema,
  SupplyTypeSchema,
  TinybarSchema,
  TokenFreezeDefaultSchema,
} from '@/core/schemas/common-schemas';
import { keyManagerNameSchema } from '@/core/services/kms/kms-types.interface';
import { HederaTokenType } from '@/core/shared/constants';

export const CreateFtNormalizedParamsSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  initialSupply: TinybarSchema,
  supplyType: SupplyTypeSchema,
  alias: z.string().optional(),
  memo: z.string().optional(),
  finalMaxSupply: TinybarSchema.optional(),
  tokenType: z.enum([
    HederaTokenType.NON_FUNGIBLE_TOKEN,
    HederaTokenType.FUNGIBLE_COMMON,
  ]),
  network: NetworkSchema,
  keyManager: keyManagerNameSchema,
  treasury: ResolvedAccountCredentialSchema,
  adminKeys: z.array(ResolvedPublicKeySchema).default([]),
  adminKeyThreshold: z.number().default(0),
  supplyKeys: z.array(ResolvedPublicKeySchema).default([]),
  supplyKeyThreshold: z.number().default(0),
  freezeKeys: z.array(ResolvedPublicKeySchema).default([]),
  freezeKeyThreshold: z.number().default(0),
  wipeKeys: z.array(ResolvedPublicKeySchema).default([]),
  wipeKeyThreshold: z.number().default(0),
  kycKeys: z.array(ResolvedPublicKeySchema).default([]),
  kycKeyThreshold: z.number().default(0),
  pauseKeys: z.array(ResolvedPublicKeySchema).default([]),
  pauseKeyThreshold: z.number().default(0),
  feeScheduleKeys: z.array(ResolvedPublicKeySchema).default([]),
  feeScheduleKeyThreshold: z.number().default(0),
  metadataKeys: z.array(ResolvedPublicKeySchema).default([]),
  metadataKeyThreshold: z.number().default(0),
  freezeDefault: TokenFreezeDefaultSchema,
  autoRenewPeriodSeconds: z.number().optional(),
  autoRenewAccountId: z.string().optional(),
  expirationTime: z.coerce.date().optional(),
});
