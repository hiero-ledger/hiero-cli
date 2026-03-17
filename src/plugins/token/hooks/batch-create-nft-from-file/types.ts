import { z } from 'zod';

import {
  KeySchema,
  MemoSchema,
  NetworkSchema,
  NonNegativeNumberOrBigintSchema,
  PrivateKeySchema,
  PrivateKeyWithAccountIdSchema,
  ResolvedAccountCredentialSchema,
  ResolvedPublicKeySchema,
  TokenNameSchema,
  TokenSymbolSchema,
} from '@/core/schemas/common-schemas';
import { keyManagerNameSchema } from '@/core/services/kms/kms-types.interface';

function validateFileSupplyTypeAndMaxSupply<
  Args extends {
    maxSupply?: number | bigint;
    supplyType?: 'finite' | 'infinite';
  },
>(args: Args, ctx: z.RefinementCtx) {
  const isFinite = args.supplyType === 'finite';

  if (isFinite && !args.maxSupply) {
    ctx.addIssue({
      message: 'maxSupply is required when supplyType is finite',
      code: z.ZodIssueCode.custom,
      path: ['maxSupply'],
    });
  }

  if (!isFinite && args.maxSupply) {
    ctx.addIssue({
      message:
        'maxSupply should not be provided when supplyType is infinite, set supplyType to finite to specify maxSupply',
      code: z.ZodIssueCode.custom,
      path: ['maxSupply'],
    });
  }
}

export const NonFungibleTokenFileSchema = z
  .object({
    name: TokenNameSchema,
    symbol: TokenSymbolSchema,
    supplyType: z.union([z.literal('finite'), z.literal('infinite')]),
    maxSupply: NonNegativeNumberOrBigintSchema.optional(),
    treasuryKey: PrivateKeyWithAccountIdSchema,
    adminKey: PrivateKeySchema,
    supplyKey: KeySchema,
    wipeKey: KeySchema.optional(),
    kycKey: KeySchema.optional(),
    freezeKey: KeySchema.optional(),
    pauseKey: KeySchema.optional(),
    feeScheduleKey: KeySchema.optional(),
    associations: z.array(KeySchema).default([]),
    memo: MemoSchema.default(''),
  })
  .superRefine(validateFileSupplyTypeAndMaxSupply);

export const CreateNftFromFileNormalizedParamsSchema = z.object({
  filename: z.string(),
  keyManager: keyManagerNameSchema,
  tokenDefinition: NonFungibleTokenFileSchema,
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
