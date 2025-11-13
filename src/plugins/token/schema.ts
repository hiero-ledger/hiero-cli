/**
 * Token Plugin State Schema
 * Single source of truth for token data structure and validation
 */
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { validateSupplyTypeAndMaxSupply } from '../../core/shared/validation/validate-supply.zod';

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
  accountId: z
    .string()
    .regex(/^0\.0\.[0-9]+$/, 'Account ID must be in format 0.0.123456'),
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
  tokenId: z
    .string()
    .regex(/^0\.0\.[0-9]+$/, 'Token ID must be in format 0.0.123456'),

  name: z
    .string()
    .min(1, 'Token name is required')
    .max(100, 'Token name must be 100 characters or less'),

  symbol: z
    .string()
    .min(1, 'Token symbol is required')
    .max(10, 'Token symbol must be 10 characters or less'),

  treasuryId: z
    .string()
    .regex(/^0\.0\.[0-9]+$/, 'Treasury ID must be in format 0.0.123456'),

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

// Command parameter validation schemas
export const TokenCreateCommandSchema = z
  .object({
    tokenName: z
      .string()
      .min(1, 'Token name is required')
      .max(100, 'Token name must be 100 characters or less'),

    symbol: z
      .string()
      .min(1, 'Token symbol is required')
      .max(10, 'Token symbol must be 10 characters or less'),

    treasury: z
      .string()
      .min(1, 'Treasury is required (either name or treasury-id:treasury-key)')
      .optional(),

    decimals: z
      .number()
      .int('Decimals must be an integer')
      .min(0, 'Decimals must be non-negative')
      .max(255, 'Decimals must be 255 or less')
      .optional(),

    // @TODO Add validation to allow only int(1), float(2.25) or base units(1000t)
    initialSupply: z
      .string()
      .min(1, 'Initial supply must be non-negative')
      .optional(),

    supplyType: z
      .string()
      .transform((val) => val.toUpperCase())
      .pipe(z.enum(['FINITE', 'INFINITE']))
      .optional(),

    // @TODO Add validation to allow only int(1), float(2.25) or base units(1000t)
    maxSupply: z.string().min(1, 'Max supply must be non-negative').optional(),

    adminKey: z.string().min(1, 'Admin key is required').optional(),

    name: z.string().min(1, 'Name must be at least 1 character').optional(),
  })
  .superRefine(validateSupplyTypeAndMaxSupply);

export type TokenCreateCommandParams = z.infer<typeof TokenCreateCommandSchema>;

/**
 * Validate token create command parameters
 */
export function validateTokenCreateParams(
  data: unknown,
): TokenCreateCommandParams {
  return TokenCreateCommandSchema.parse(data);
}

/**
 * Safe validate token create command parameters
 */
export function safeValidateTokenCreateParams(data: unknown) {
  return TokenCreateCommandSchema.safeParse(data);
}

// TokenId or name
const tokenIdOrName = z.string().min(1, 'Token ID or name is required');

// Command parameter validation schema for associate command
export const TokenAssociateCommandSchema = z.object({
  token: tokenIdOrName,

  account: z
    .string()
    .min(1, 'Account is required (either name or account-id:account-key)'),
});

export type TokenAssociateCommandParams = z.infer<
  typeof TokenAssociateCommandSchema
>;

/**
 * Validate token associate command parameters
 */
export function validateTokenAssociateParams(
  data: unknown,
): TokenAssociateCommandParams {
  return TokenAssociateCommandSchema.parse(data);
}

/**
 * Safe validate token associate command parameters
 */
export function safeValidateTokenAssociateParams(data: unknown) {
  return TokenAssociateCommandSchema.safeParse(data);
}

// Command parameter validation schema for transfer command
export const TokenTransferCommandSchema = z.object({
  token: tokenIdOrName,

  from: z
    .string()
    .min(
      1,
      'Invalid --from parameter. To use the default operator, omit this argument or specify a valid name or account-id:private-key',
    )
    .optional(),

  to: z.string().min(1, 'To account is required (either name or account-id)'),

  // @TODO Add validation to allow only int(1), float(2.25) or base units(1000t)
  balance: z.union([z.number().positive(), z.string().min(1)]),
});

export type TokenTransferCommandParams = z.infer<
  typeof TokenTransferCommandSchema
>;

/**
 * Validate token transfer command parameters
 */
export function validateTokenTransferParams(
  data: unknown,
): TokenTransferCommandParams {
  return TokenTransferCommandSchema.parse(data);
}

/**
 * Safe validate token transfer command parameters
 */
export function safeValidateTokenTransferParams(data: unknown) {
  return TokenTransferCommandSchema.safeParse(data);
}
