/**
 * Token Plugin State Schema
 * Single source of truth for token data structure and validation
 */
import { z } from 'zod';

import { EntityIdSchema, KeyOrAccountAliasSchema } from '@/core/schemas';
import { zodToJsonSchema } from '@/core/utils/zod-to-json-schema';

// Zod schema for token association
export const TokenAssociationSchema = z.object({
  name: z.string().min(1, 'Association name is required'),
  accountId: EntityIdSchema,
});

// Zod schema for custom fees
export const CustomFeeSchema = z.object({
  type: z.string(),
  unitType: z.string().optional(),
  amount: z.number().optional(),
  denom: z.string().optional(),
  numerator: z.number().optional(),
  denominator: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  collectorId: z.string().optional(),
  exempt: z.boolean().optional(),
});

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

  supplyType: z.enum(['FINITE', 'INFINITE'], {
    error: () => ({
      message: 'Supply type must be either FINITE or INFINITE',
    }),
  }),

  maxSupply: z
    .bigint({ message: 'Max supply must be an integer', coerce: true })
    .min(0n, 'Max supply must be non-negative'),

  network: z.enum(['mainnet', 'testnet', 'previewnet', 'localnet'], {
    error: () => ({
      message: 'Network must be mainnet, testnet, previewnet, or localnet',
    }),
  }),

  associations: z.array(TokenAssociationSchema).default([]),

  customFees: z.array(CustomFeeSchema).default([]),

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

export const TokenFileFixedFeeSchema = z
  .object({
    type: z.literal('fixed'),
    amount: z.number().int().positive('Amount must be positive'),
    unitType: z.literal('HBAR').optional().default('HBAR'),
    collectorId: EntityIdSchema.optional(),
    exempt: z.boolean().optional(),
  })
  .strict();

export const TokenFileSchema = z.object({
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(20),
  decimals: z.number().int().min(0).max(18),
  supplyType: z.union([z.literal('finite'), z.literal('infinite')]),
  initialSupply: z
    .union([z.number(), z.bigint()])
    .transform((val) => BigInt(val))
    .pipe(z.bigint().nonnegative()),
  maxSupply: z
    .union([z.number(), z.bigint()])
    .transform((val) => BigInt(val))
    .pipe(z.bigint().nonnegative())
    .default(0n),
  treasuryKey: KeyOrAccountAliasSchema,
  adminKey: KeyOrAccountAliasSchema,
  supplyKey: KeyOrAccountAliasSchema.optional(),
  wipeKey: KeyOrAccountAliasSchema.optional(),
  kycKey: KeyOrAccountAliasSchema.optional(),
  freezeKey: KeyOrAccountAliasSchema.optional(),
  pauseKey: KeyOrAccountAliasSchema.optional(),
  feeScheduleKey: KeyOrAccountAliasSchema.optional(),
  associations: z.array(KeyOrAccountAliasSchema).default([]),
  customFees: z.array(TokenFileFixedFeeSchema).default([]),
  memo: z.string().max(100).optional().default(''),
});

export type TokenFileDefinition = z.infer<typeof TokenFileSchema>;
