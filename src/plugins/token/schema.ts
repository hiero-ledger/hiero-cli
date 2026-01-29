/**
 * Token Plugin State Schema
 * Single source of truth for token data structure and validation
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  HtsDecimalsSchema,
  KeyOrAccountAliasSchema,
  MemoSchema,
  NonNegativeNumberOrBigintSchema,
  TokenNameSchema,
  TokenSymbolSchema,
  TokenTypeSchema,
} from '@/core/schemas';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType, SupportedNetwork } from '@/core/types/shared.types';
import { zodToJsonSchema } from '@/core/utils/zod-to-json-schema';

// Zod schema for token association
export const TokenAssociationSchema = z.object({
  name: z.string().min(1, 'Association name is required'),
  accountId: EntityIdSchema,
});

export const TokenFileFixedFeeSchema = z
  .object({
    type: z.literal('fixed'),
    amount: z.int().positive('Amount must be positive'),
    unitType: z.enum(['HBAR', 'TOKEN']).optional().default('HBAR'),
    collectorId: EntityIdSchema,
    exempt: z.boolean().optional(),
  })
  .strict();

export const TokenFileFractionalFeeSchema = z
  .object({
    type: z.literal('fractional'),
    numerator: z.int().positive('Numerator must be positive'),
    denominator: z.int().positive('Denominator must be positive'),
    min: z.int().nonnegative().optional(),
    max: z.int().positive().optional(),
    netOfTransfers: z.boolean(),
    collectorId: EntityIdSchema,
    exempt: z.boolean().optional(),
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

  adminPublicKey: z.string().optional(),
  supplyPublicKey: z.string().optional(),
  wipePublicKey: z.string().optional(),
  kycPublicKey: z.string().optional(),
  freezePublicKey: z.string().optional(),
  pausePublicKey: z.string().optional(),
  feeSchedulePublicKey: z.string().optional(),

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

export const FungibleTokenFileSchema = z.object({
  name: TokenNameSchema,
  symbol: TokenSymbolSchema,
  decimals: HtsDecimalsSchema,
  supplyType: z.union([z.literal('finite'), z.literal('infinite')]),
  initialSupply: NonNegativeNumberOrBigintSchema,
  maxSupply: NonNegativeNumberOrBigintSchema.default(0n),
  treasuryKey: KeyOrAccountAliasSchema,
  adminKey: KeyOrAccountAliasSchema,
  supplyKey: KeyOrAccountAliasSchema.optional(),
  wipeKey: KeyOrAccountAliasSchema.optional(),
  kycKey: KeyOrAccountAliasSchema.optional(),
  freezeKey: KeyOrAccountAliasSchema.optional(),
  pauseKey: KeyOrAccountAliasSchema.optional(),
  feeScheduleKey: KeyOrAccountAliasSchema.optional(),
  associations: z.array(KeyOrAccountAliasSchema).default([]),
  customFees: z
    .array(TokenFileCustomFeeSchema)
    .max(10, 'Maximum 10 custom fees allowed per token')
    .default([]),
  memo: MemoSchema.default(''),
  tokenType: TokenTypeSchema,
});

export type FungibleTokenFileDefinition = z.infer<
  typeof FungibleTokenFileSchema
>;

function validateFileSupplyTypeAndMaxSupply<
  Args extends {
    maxSupply?: bigint | number;
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
    treasuryKey: KeyOrAccountAliasSchema,
    adminKey: KeyOrAccountAliasSchema,
    supplyKey: KeyOrAccountAliasSchema,
    wipeKey: KeyOrAccountAliasSchema.optional(),
    kycKey: KeyOrAccountAliasSchema.optional(),
    freezeKey: KeyOrAccountAliasSchema.optional(),
    pauseKey: KeyOrAccountAliasSchema.optional(),
    feeScheduleKey: KeyOrAccountAliasSchema.optional(),
    associations: z.array(KeyOrAccountAliasSchema).default([]),
    memo: MemoSchema.default(''),
  })
  .superRefine(validateFileSupplyTypeAndMaxSupply);

export type NonFungibleTokenFileDefinition = z.infer<
  typeof NonFungibleTokenFileSchema
>;
