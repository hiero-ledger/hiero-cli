import { z } from 'zod';

import {
  NetworkSchema,
  ResolvedAccountCredentialSchema,
  ResolvedPublicKeySchema,
  SupplyTypeSchema,
  TinybarSchema,
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
  admin: ResolvedPublicKeySchema.optional(),
  supply: ResolvedPublicKeySchema.optional(),
  freeze: ResolvedPublicKeySchema.optional(),
  wipe: ResolvedPublicKeySchema.optional(),
  kyc: ResolvedPublicKeySchema.optional(),
  pause: ResolvedPublicKeySchema.optional(),
  feeSchedule: ResolvedPublicKeySchema.optional(),
  metadata: ResolvedPublicKeySchema.optional(),
  freezeDefault: z.boolean().default(false),
});
