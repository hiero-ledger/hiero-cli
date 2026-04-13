import { z } from 'zod';

import {
  NetworkSchema,
  SupplyTypeSchema,
  TinybarSchema,
} from '@/core/schemas/common-schemas';
import { keyManagerNameSchema } from '@/core/services/kms/kms-types.interface';
import { HederaTokenType } from '@/core/shared/constants';

const ResolvedAccountCredentialSchema = z.object({
  keyRefId: z.string(),
  accountId: z.string(),
  publicKey: z.string(),
});

export const CreateNftNormalizedParamsSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  initialSupply: TinybarSchema,
  tokenType: z.enum([
    HederaTokenType.NON_FUNGIBLE_TOKEN,
    HederaTokenType.FUNGIBLE_COMMON,
  ]),
  supplyType: SupplyTypeSchema,
  alias: z.string().optional(),
  memo: z.string().optional(),
  network: NetworkSchema,
  keyManager: keyManagerNameSchema,
  treasury: ResolvedAccountCredentialSchema,
  admin: ResolvedAccountCredentialSchema,
  supply: ResolvedAccountCredentialSchema,
  finalMaxSupply: TinybarSchema.optional(),
  adminKeyProvided: z.boolean(),
});
