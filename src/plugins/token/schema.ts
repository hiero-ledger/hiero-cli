/**
 * Token Plugin State Schema
 * Single source of truth for token data structure and validation
 */
import { z } from 'zod';

import {
  AmountInputSchema,
  AutoRenewPeriodSecondsSchema,
  EntityIdSchema,
  ExpirationTimeSchema,
  HtsDecimalsSchema,
  KeyRefIdArraySchema,
  KeySchema,
  KeyThresholdOptionalSchema,
  MemoSchema,
  NonNegativeNumberOrBigintSchema,
  TokenAliasNameSchema,
  TokenNameSchema,
  TokenSymbolSchema,
  TokenTypeSchema,
} from '@/core/schemas';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType, SupportedNetwork } from '@/core/types/shared.types';
import { CustomFeeType, FixedFeeUnitType } from '@/core/types/token.types';
import { applyKeyThresholdSuperRefine } from '@/core/utils/key-threshold-input-schema';
import { processTokenBalanceInput } from '@/core/utils/process-token-balance-input';
import { zodToJsonSchema } from '@/core/utils/zod-to-json-schema';

// Zod schema for token association
export const TokenAssociationSchema = z.object({
  name: z.string().min(1, 'Association name is required'),
  accountId: EntityIdSchema,
});

export const TokenFileFixedFeeSchema = z
  .object({
    type: z.literal(CustomFeeType.FIXED),
    amount: z.int().positive('Amount must be positive'),
    unitType: z.nativeEnum(FixedFeeUnitType).default(FixedFeeUnitType.HBAR),
    collectorId: EntityIdSchema,
    exempt: z.boolean().default(false),
  })
  .strict();

export const TokenFileFractionalFeeSchema = z
  .object({
    type: z.literal(CustomFeeType.FRACTIONAL),
    numerator: z.int().positive('Numerator must be positive'),
    denominator: z.int().positive('Denominator must be positive'),
    min: z.int().nonnegative().optional(),
    max: z.int().positive().optional(),
    netOfTransfers: z.boolean(),
    collectorId: EntityIdSchema,
    exempt: z.boolean().default(false),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.numerator > data.denominator) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Numerator must be less than or equal to denominator (fee cannot exceed 100%)',
        path: ['numerator'],
      });
    }
    if (
      data.min !== undefined &&
      data.max !== undefined &&
      data.min > data.max
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Min must be less than or equal to max',
        path: ['min'],
      });
    }
  });

export const TokenFileCustomFeeSchema = z.discriminatedUnion('type', [
  TokenFileFixedFeeSchema,
  TokenFileFractionalFeeSchema,
]);

// Main token data schema
export const TokenDataSchema = z.object({
  tokenId: EntityIdSchema,

  name: z
    .string()
    .min(1, 'Token name is required')
    .max(100, 'Token name must be 100 characters or less'),

  symbol: z
    .string()
    .min(1, 'Token symbol is required')
    .max(10, 'Token symbol must be 10 characters or less'),

  treasuryId: EntityIdSchema,

  adminKeyRefIds: KeyRefIdArraySchema,
  adminKeyThreshold: z.number().int().min(0).default(0),
  supplyKeyRefIds: KeyRefIdArraySchema,
  supplyKeyThreshold: z.number().int().min(0).default(0),
  wipeKeyRefIds: KeyRefIdArraySchema,
  wipeKeyThreshold: z.number().int().min(0).default(0),
  kycKeyRefIds: KeyRefIdArraySchema,
  kycKeyThreshold: z.number().int().min(0).default(0),
  freezeKeyRefIds: KeyRefIdArraySchema,
  freezeKeyThreshold: z.number().int().min(0).default(0),
  pauseKeyRefIds: KeyRefIdArraySchema,
  pauseKeyThreshold: z.number().int().min(0).default(0),
  feeScheduleKeyRefIds: KeyRefIdArraySchema,
  feeScheduleKeyThreshold: z.number().int().min(0).default(0),
  metadataKeyRefIds: KeyRefIdArraySchema,
  metadataKeyThreshold: z.number().int().min(0).default(0),

  decimals: z
    .number()
    .int('Decimals must be an integer')
    .min(0, 'Decimals must be non-negative')
    .max(255, 'Decimals must be 255 or less'),

  initialSupply: z
    .bigint({ message: 'Initial supply must be an integer', coerce: true })
    .min(0n, 'Initial supply must be non-negative'),

  tokenType: z.enum(
    [HederaTokenType.NON_FUNGIBLE_TOKEN, HederaTokenType.FUNGIBLE_COMMON],
    {
      error: () => ({
        message:
          'Token type must be either NonFungibleUnique or FungibleCommon',
      }),
    },
  ),

  supplyType: z.enum(SupplyType, {
    message: `Supply type must be either ${SupplyType.FINITE} or ${SupplyType.INFINITE}`,
  }),

  maxSupply: z
    .bigint({ message: 'Max supply must be an integer', coerce: true })
    .min(0n, 'Max supply must be non-negative'),

  network: z.enum(SupportedNetwork, {
    error: () => ({
      message: 'Network must be mainnet, testnet, previewnet, or localnet',
    }),
  }),

  associations: z.array(TokenAssociationSchema).default([]),

  customFees: z.array(TokenFileCustomFeeSchema).default([]),

  memo: z.string().max(100).optional(),
});

// TypeScript type inferred from Zod schema
export type TokenData = z.infer<typeof TokenDataSchema>;
export type TokenCustomFeeType = z.infer<typeof TokenFileCustomFeeSchema>;

// JSON Schema for manifest (automatically generated from Zod schema)
// BigInt is not representable in JSON Schema, so we convert it to string with numeric pattern
export const TOKEN_JSON_SCHEMA = zodToJsonSchema(TokenDataSchema);

/**
 * Validate token data using Zod schema
 */
export function validateTokenData(data: unknown): data is TokenData {
  try {
    TokenDataSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse and validate token data with detailed error messages
 */
export function parseTokenData(data: unknown): TokenData {
  return TokenDataSchema.parse(data);
}

/**
 * Safe parse token data (returns success/error instead of throwing)
 */
export function safeParseTokenData(data: unknown) {
  return TokenDataSchema.safeParse(data);
}

export const FungibleTokenFileSchema = z
  .object({
    name: TokenAliasNameSchema.describe('CLI alias for the token'),
    tokenName: TokenNameSchema.describe('On-chain token name'),
    symbol: TokenSymbolSchema,
    decimals: HtsDecimalsSchema,
    supplyType: z.union([z.literal('finite'), z.literal('infinite')]),
    initialSupply: AmountInputSchema,
    maxSupply: AmountInputSchema.default('0'),
    treasuryKey: KeySchema,
    adminKey: KeySchema.optional(),
    supplyKey: KeySchema.optional(),
    wipeKey: KeySchema.optional(),
    kycKey: KeySchema.optional(),
    freezeKey: KeySchema.optional(),
    freezeDefault: z
      .boolean()
      .default(false)
      .describe(
        'When true and freezeKey is set, new associations are frozen by default.',
      ),
    pauseKey: KeySchema.optional(),
    feeScheduleKey: KeySchema.optional(),
    metadataKey: KeySchema.optional(),
    associations: z.array(KeySchema).default([]),
    customFees: z
      .array(TokenFileCustomFeeSchema)
      .max(10, 'Maximum 10 custom fees allowed per token')
      .default([]),
    memo: MemoSchema.default(''),
    tokenType: TokenTypeSchema,
    autoRenewPeriod: AutoRenewPeriodSecondsSchema,
    autoRenewAccount: KeySchema.optional(),
    expirationTime: ExpirationTimeSchema,
  })
  .transform((data) => ({
    ...data,
    initialSupply: processTokenBalanceInput(data.initialSupply, data.decimals),
    maxSupply: processTokenBalanceInput(data.maxSupply ?? '0', data.decimals),
  }));

export type FungibleTokenFileDefinition = z.output<
  typeof FungibleTokenFileSchema
>;

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

// Accepts either a single key string (backward compat) or an array of key strings.
// Always normalizes to an array.
const KeyOrListSchema = (minLength: number, label: string) =>
  z.preprocess(
    (val) => (typeof val === 'string' ? [val] : val),
    z
      .array(KeySchema)
      .min(minLength, `At least ${minLength} ${label} key(s) required`),
  );

const OptionalKeyOrListSchema = z.preprocess((val) => {
  if (val === undefined || val === null) return [];
  return typeof val === 'string' ? [val] : val;
}, z.array(KeySchema).default([]));

export const NonFungibleTokenFileSchema = z
  .object({
    name: TokenAliasNameSchema.describe('CLI alias for the token'),
    tokenName: TokenNameSchema.describe('On-chain token name'),
    symbol: TokenSymbolSchema,
    supplyType: z.union([z.literal('finite'), z.literal('infinite')]),
    maxSupply: NonNegativeNumberOrBigintSchema.optional(),
    treasuryKey: KeySchema,
    adminKey: KeyOrListSchema(1, 'admin'),
    adminKeyThreshold: KeyThresholdOptionalSchema,
    supplyKey: KeyOrListSchema(1, 'supply'),
    supplyKeyThreshold: KeyThresholdOptionalSchema,
    wipeKey: OptionalKeyOrListSchema,
    wipeKeyThreshold: KeyThresholdOptionalSchema,
    kycKey: OptionalKeyOrListSchema,
    kycKeyThreshold: KeyThresholdOptionalSchema,
    freezeKey: OptionalKeyOrListSchema,
    freezeKeyThreshold: KeyThresholdOptionalSchema,
    pauseKey: OptionalKeyOrListSchema,
    pauseKeyThreshold: KeyThresholdOptionalSchema,
    feeScheduleKey: OptionalKeyOrListSchema,
    feeScheduleKeyThreshold: KeyThresholdOptionalSchema,
    associations: z.array(KeySchema).default([]),
    memo: MemoSchema.default(''),
  })
  .superRefine(validateFileSupplyTypeAndMaxSupply)
  .superRefine((data, context) => {
    applyKeyThresholdSuperRefine(data, context, [
      {
        thresholdField: 'adminKeyThreshold',
        getKeyCount: (row) => row.adminKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'adminKeyThreshold can only be set when multiple admin keys are provided',
          thresholdExceedsKeyCount:
            'adminKeyThreshold must not exceed the number of admin keys provided',
        },
      },
      {
        thresholdField: 'supplyKeyThreshold',
        getKeyCount: (row) => row.supplyKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'supplyKeyThreshold can only be set when multiple supply keys are provided',
          thresholdExceedsKeyCount:
            'supplyKeyThreshold must not exceed the number of supply keys provided',
        },
      },
      {
        thresholdField: 'wipeKeyThreshold',
        getKeyCount: (row) => row.wipeKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'wipeKeyThreshold can only be set when multiple wipe keys are provided',
          thresholdExceedsKeyCount:
            'wipeKeyThreshold must not exceed the number of wipe keys provided',
        },
      },
      {
        thresholdField: 'kycKeyThreshold',
        getKeyCount: (row) => row.kycKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'kycKeyThreshold can only be set when multiple KYC keys are provided',
          thresholdExceedsKeyCount:
            'kycKeyThreshold must not exceed the number of KYC keys provided',
        },
      },
      {
        thresholdField: 'freezeKeyThreshold',
        getKeyCount: (row) => row.freezeKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'freezeKeyThreshold can only be set when multiple freeze keys are provided',
          thresholdExceedsKeyCount:
            'freezeKeyThreshold must not exceed the number of freeze keys provided',
        },
      },
      {
        thresholdField: 'pauseKeyThreshold',
        getKeyCount: (row) => row.pauseKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'pauseKeyThreshold can only be set when multiple pause keys are provided',
          thresholdExceedsKeyCount:
            'pauseKeyThreshold must not exceed the number of pause keys provided',
        },
      },
      {
        thresholdField: 'feeScheduleKeyThreshold',
        getKeyCount: (row) => row.feeScheduleKey.length,
        messages: {
          thresholdWithoutEnoughKeys:
            'feeScheduleKeyThreshold can only be set when multiple fee schedule keys are provided',
          thresholdExceedsKeyCount:
            'feeScheduleKeyThreshold must not exceed the number of fee schedule keys provided',
        },
      },
    ]);
  });

export type NonFungibleTokenFileDefinition = z.infer<
  typeof NonFungibleTokenFileSchema
>;
