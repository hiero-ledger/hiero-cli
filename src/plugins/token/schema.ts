/**
 * Token Plugin State Schema
 * Single source of truth for token data structure and validation
 */
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { EntityIdSchema } from '../../core/schemas';

// Zod schema for token keys
export const TokenKeysSchema = z.object({
  adminKey: z.string().min(1, 'Admin key is required'),
  supplyKey: z.string().optional().default(''),
  wipeKey: z.string().optional().default(''),
  kycKey: z.string().optional().default(''),
  freezeKey: z.string().optional().default(''),
  pauseKey: z.string().optional().default(''),
  feeScheduleKey: z.string().optional().default(''),
  treasuryKey: z.string().min(1, 'Treasury key is required'),
});

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

  decimals: z
    .number()
    .int('Decimals must be an integer')
    .min(0, 'Decimals must be non-negative')
    .max(255, 'Decimals must be 255 or less'),

  initialSupply: z
    .bigint({ message: 'Initial supply must be an integer', coerce: true })
    .min(0n, 'Initial supply must be non-negative'),

  supplyType: z.enum(['FINITE', 'INFINITE'], {
    errorMap: () => ({
      message: 'Supply type must be either FINITE or INFINITE',
    }),
  }),

  maxSupply: z
    .bigint({ message: 'Max supply must be an integer', coerce: true })
    .min(0n, 'Max supply must be non-negative'),

  keys: TokenKeysSchema,

  network: z.enum(['mainnet', 'testnet', 'previewnet', 'localnet'], {
    errorMap: () => ({
      message: 'Network must be mainnet, testnet, previewnet, or localnet',
    }),
  }),

  associations: z.array(TokenAssociationSchema).default([]),

  customFees: z.array(CustomFeeSchema).default([]),

  memo: z.string().max(100).optional(),
});

// TypeScript type inferred from Zod schema
export type TokenData = z.infer<typeof TokenDataSchema>;
export type TokenKeys = z.infer<typeof TokenKeysSchema>;
export type TokenAssociation = z.infer<typeof TokenAssociationSchema>;
export type CustomFee = z.infer<typeof CustomFeeSchema>;

// Namespace constant
export const TOKEN_NAMESPACE = 'token-tokens';

// JSON Schema for manifest (automatically generated from Zod schema)
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

// Treasury is a separate field in the file, so we omit treasuryKey here
export const TokenFileKeysSchema = TokenKeysSchema.omit({
  treasuryKey: true,
}).strict();

export const TokenFileFixedFeeSchema = z
  .object({
    type: z.literal('fixed'),
    amount: z.number().int().positive('Amount must be positive'),
    unitType: z.literal('HBAR').optional().default('HBAR'),
    collectorId: EntityIdSchema.optional(),
    exempt: z.boolean().optional(),
  })
  .strict();

export const TokenFileAccountSchema = z
  .object({
    accountId: EntityIdSchema,
    key: z.string().min(1, 'account key is required'),
  })
  .strict();

export const TokenFileTreasurySchema = z
  .string()
  .min(1, 'Treasury is required (either name or treasury-id:treasury-key)');

export const TokenFileSchema = z
  .object({
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
    treasury: TokenFileTreasurySchema,
    keys: TokenFileKeysSchema,
    associations: z.array(TokenFileAccountSchema).default([]),
    customFees: z.array(TokenFileFixedFeeSchema).default([]),
    memo: z.string().max(100).optional().default(''),
  })
  .strict();

export type TokenFileDefinition = z.infer<typeof TokenFileSchema>;
