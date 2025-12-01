/**
 * Common Zod Schema Definitions
 *
 * This file contains reusable Zod schemas for common Hedera data types
 * that are used across multiple plugin command outputs.
 *
 * Based on ADR-003: Result-Oriented Command Handler Contract
 */
import { z } from 'zod';
import type { KeyAlgorithmType as KeyAlgorithmType } from '../services/kms/kms-types.interface';
import { KeyAlgorithm } from '../shared/constants';

// ======================================================
// 1. ECDSA (secp256k1) Keys
// ======================================================

// Public key — 33 bytes (compressed) or DER (~70 bytes)
export const EcdsaPublicKeySchema = z
  .string()
  .trim()
  .regex(
    /^(?:0[2-3][0-9a-fA-F]{64}|30[0-9a-fA-F]{68,150})$/,
    'Invalid ECDSA public key: must be 33-byte compressed hex or valid DER encoding',
  );

// Private key — 32 bytes (hex) or DER (~120 bytes)
export const EcdsaPrivateKeySchema = z
  .string()
  .trim()
  .regex(
    /^(?:(?:0x)?[0-9a-fA-F]{64}|(?:0x)?30[0-9a-fA-F]{100,180})$/,
    'Invalid ECDSA private key: must be 32-byte hex or DER encoding',
  );

// ======================================================
// 2. Ed25519 Keys
// ======================================================

// Public key — 32 bytes (hex) or DER (~44 bytes)
export const Ed25519PublicKeySchema = z
  .string()
  .trim()
  .regex(
    /^(?:[0-9a-fA-F]{64}|30[0-9a-fA-F]{60,120})$/,
    'Invalid Ed25519 public key: must be 32-byte hex or DER encoding',
  );

// Private key — 32 or 64 bytes (hex) or DER (~80 bytes)
export const Ed25519PrivateKeySchema = z
  .string()
  .trim()
  .regex(
    /^(?:(?:0x)?[0-9a-fA-F]{64}|(?:0x)?[0-9a-fA-F]{128}|(?:0x)?30[0-9a-fA-F]{80,160})$/,
    'Invalid Ed25519 private key: must be 32/64-byte hex or DER encoding',
  );

// ======================================================
// 2a. Private Key with Optional Type Prefix
// ======================================================

/**
 * Private key with optional key type prefix
 * Format: "ed25519:...", "ecdsa:...", or just "..."
 * Supports hex keys with optional 0x prefix
 *
 * Note: This schema only parses the key type prefix and extracts the key value.
 * Key format validation should happen when the key is actually used (e.g., during import).
 */
export const PrivateKeyWithTypeSchema: z.ZodType<
  { keyType: KeyAlgorithmType; privateKey: string },
  z.ZodTypeDef,
  string
> = z
  .string()
  .trim()
  .min(1, 'Private key cannot be empty')
  .transform((val) => {
    // Extract key type prefix and key value
    const match = val.match(/^(ecdsa|ed25519):(.*)$/i); // Note: regex uses lowercase for case-insensitive matching
    if (match) {
      const keyType = match[1].toLowerCase() as KeyAlgorithmType;
      const keyValue = match[2].trim();
      if (!keyValue) {
        throw new Error(
          `Private key cannot be empty. Key type prefix '${match[1]}' provided but no key follows.`,
        );
      }
      // Return parsed values without format validation
      // Format validation happens later when the key is actually used (e.g., during import)
      return { keyType, privateKey: keyValue };
    }
    // No prefix - default to ecdsa
    // No format validation here - validation happens when key is actually used
    return { keyType: KeyAlgorithm.ECDSA, privateKey: val };
  });

// ======================================================
// 3. HBAR balances (in HBARs, decimal format)
// ======================================================

// 1 HBAR = 100,000,000 tinybars (8 decimals)
// Safe 64-bit signed tinybar limit = 9,223,372,036,854,775,807 tinybars
const MAX_TINYBARS = 9_223_372_036_854_775_807n;
const MIN_TINYBARS = -9_223_372_036_854_775_808n;

export const HbarDecimalSchema = z
  .number()
  .min(Number(MIN_TINYBARS / 100_000_000n))
  .max(Number(MAX_TINYBARS / 100_000_000n))
  .refine(
    (val) => Number.isFinite(val),
    'Invalid HBAR value: must be finite number',
  );

// ======================================================
// 4. Tinybar balances (base unit integer)
// ======================================================
export const TinybarSchema = z
  .union([
    z.string().regex(/^-?\d+$/, 'Tinybars must be integer string'),
    z.number().int(),
    z.bigint(),
  ])
  .transform((val) => BigInt(val))
  .refine(
    (val) => val >= MIN_TINYBARS && val <= MAX_TINYBARS,
    `Tinybars out of int64 range (${MIN_TINYBARS}..${MAX_TINYBARS})`,
  );

// ======================================================
// 5. HTS Token Balances
// ======================================================

// HTS decimals: 0–8 allowed (immutable after token creation)
export const HtsDecimalsSchema = z.number().int().min(0).max(8);

// HTS base unit (integer form)
export const HtsBaseUnitSchema = z
  .union([
    z.string().regex(/^\d+$/, 'Base unit must be integer string'),
    z.number().int(),
    z.bigint(),
  ])
  .transform((val) => BigInt(val))
  .refine(
    (val) => val >= 0n && val <= MAX_TINYBARS,
    `HTS base unit out of int64 range`,
  );

// HTS decimal number (human-readable, e.g. 1.23 tokens)
export const HtsDecimalSchema = z
  .object({
    amount: z.number().nonnegative(),
    decimals: HtsDecimalsSchema,
  })
  .refine(
    ({ amount, decimals }) => amount * 10 ** decimals <= Number(MAX_TINYBARS),
    'HTS token amount exceeds int64 base unit range',
  );

// ======================================================
// 6. EVM Token Balances (ERC-20 style)
// ======================================================

// Standard ERC-20 decimals: usually 18
export const EvmDecimalsSchema = z.number().int().min(0).max(36);

// Base unit (wei-like integer)
export const EvmBaseUnitSchema = z
  .union([
    z.string().regex(/^\d+$/, 'Base unit must be integer string'),
    z.number().int(),
    z.bigint(),
  ])
  .transform((val) => BigInt(val))
  .refine((val) => val >= 0n, 'EVM base unit cannot be negative');

// Decimal number (human-readable, e.g. 1.5 tokens)
export const EvmDecimalSchema = z
  .object({
    amount: z.number().nonnegative(),
    decimals: EvmDecimalsSchema,
  })
  .refine(({ decimals }) => decimals <= 36, 'Too many decimals for EVM token');

// ======================================================
// 7. Legacy Schemas (for backward compatibility)
// ======================================================

/**
 * Hedera Entity ID pattern
 * Format: 0.0.12345
 * Example: 0.0.123456
 */
export const EntityIdSchema = z
  .string()
  .regex(
    /^0\.0\.[1-9][0-9]*$/,
    'Hedera entity ID must be in format 0.0.{number}',
  )
  .describe('Hedera entity ID in format 0.0.{number}');

/**
 * Hedera Timestamp pattern
 * Format: {seconds}.{nanoseconds}
 * Example: 1700000000.123456789
 */
export const TimestampSchema = z
  .string()
  .regex(
    /^[0-9]+\.[0-9]{9}$/,
    'Hedera timestamp must be in format {seconds}.{nanoseconds}',
  )
  .describe('Hedera timestamp in format {seconds}.{nanoseconds}');

/**
 * Hedera Transaction ID pattern
 * Format: {accountId}@{timestamp}
 * Example: 0.0.123@1700000000.123456789
 */
export const TransactionIdSchema = z
  .string()
  .regex(
    /^0\.0\.[1-9][0-9]*@[0-9]+\.[0-9]{9}$/,
    'Hedera transaction ID must be in format {accountId}@{timestamp}',
  )
  .describe('Hedera transaction ID in format {accountId}@{timestamp}');

/**
 * EVM Address (Ethereum-compatible address)
 * Format: 0x followed by 40 hexadecimal characters
 */
export const EvmAddressSchema = z
  .string()
  .regex(
    /^0x[0-9a-fA-F]{40}$/,
    'EVM address must be 0x followed by 40 hexadecimal characters',
  )
  .describe('EVM-compatible address');

/**
 * Account ID with Private Key
 * Format: accountId:privateKey or accountId:keyType:privateKey
 * Example: 0.0.123456:302e020100301006072a8648ce3d020106052b8104000a04220420...
 * Example: 0.0.123456:ed25519:302e020100301006072a8648ce3d020106052b8104000a04220420...
 */
export const AccountIdKeyPairSchema = z
  .string()
  .regex(
    /^0\.0\.[1-9][0-9]*:(?:(?:ecdsa|ed25519):)?(?:(?:0x)?[0-9a-fA-F]{64}|(?:0x)?[0-9a-fA-F]{128}|(?:0x)?30[0-9a-fA-F]{100,})$/i,
    'Account ID with private key must be in format 0.0.{number}:{private_key} or 0.0.{number}:{keyType}:{private_key}',
  )
  .describe(
    'Account ID with private key in format 0.0.{number}:{private_key} or 0.0.{number}:{keyType}:{private_key}',
  );

/**
 * Network name
 * Supported Hedera network names
 */
export const NetworkSchema = z
  .enum(['mainnet', 'testnet', 'previewnet', 'localnet'])
  .describe('Hedera network identifier');

/**
 * Key Type
 * Supported key types in Hedera
 */
export const KeyTypeSchema = z
  .enum([KeyAlgorithm.ECDSA, KeyAlgorithm.ED25519])
  .describe('Cryptographic key type');

/**
 * Token Supply Type
 */
export const SupplyTypeSchema = z
  .enum(['FINITE', 'INFINITE'])
  .describe('Token supply type');

/**
 * ISO 8601 Timestamp
 * Standard date-time format
 */
export const IsoTimestampSchema = z
  .string()
  .datetime()
  .describe('ISO 8601 timestamp');

// ======================================================
// 8. Composite Schemas
// ======================================================

/**
 * Account Data (Full)
 * Complete account information
 */
export const AccountDataSchema = z
  .object({
    accountId: EntityIdSchema,
    name: z.string().describe('Account name or alias'),
    type: KeyTypeSchema,
    network: NetworkSchema,
    evmAddress: EvmAddressSchema.nullable(),
    publicKey: z
      .union([EcdsaPublicKeySchema, Ed25519PublicKeySchema])
      .nullable(),
    balance: TinybarSchema.nullable(),
  })
  .describe('Complete account information');

/**
 * Token Data (Full)
 * Complete token information
 */
export const TokenDataSchema = z
  .object({
    tokenId: EntityIdSchema,
    name: z.string().describe('Token name'),
    symbol: z.string().describe('Token symbol'),
    decimals: HtsDecimalsSchema,
    initialSupply: z.string().describe('Initial supply in base units'),
    supplyType: SupplyTypeSchema,
    treasuryId: EntityIdSchema,
    network: NetworkSchema,
  })
  .describe('Complete token information');

/**
 * Topic Data (Full)
 * Complete topic information
 */
export const TopicDataSchema = z
  .object({
    topicId: EntityIdSchema,
    name: z.string().describe('Topic name or alias'),
    memo: z.string().describe('Topic memo').nullable(),
    network: NetworkSchema,
    createdAt: IsoTimestampSchema,
  })
  .describe('Complete topic information');

/**
 * Transaction Result (Common)
 * Standard transaction execution result
 */
export const TransactionResultSchema = z
  .object({
    transactionId: TransactionIdSchema,
    status: z.string().describe('Transaction status'),
    timestamp: TimestampSchema,
  })
  .describe('Standard transaction execution result');

// ======================================================
// 9. Legacy Compatibility Exports
// ======================================================

// For backward compatibility
export const TokenAmountSchema = HtsBaseUnitSchema;
export const TokenBalanceSchema = z
  .object({
    baseUnitAmount: HtsBaseUnitSchema,
    name: z.string().describe('Token name or symbol'),
    decimals: HtsDecimalsSchema,
  })
  .describe('Token balance with denomination information');

export const TinybarBalanceSchema = TinybarSchema;

// Generic public key schema for backward compatibility
export const PublicKeySchema = z.union([
  EcdsaPublicKeySchema,
  Ed25519PublicKeySchema,
]);

/**
 * Export all Zod schemas as a single object for easy import
 */
export const COMMON_ZOD_SCHEMAS = {
  // New cryptographic schemas
  ecdsaPublicKey: EcdsaPublicKeySchema,
  ecdsaPrivateKey: EcdsaPrivateKeySchema,
  ed25519PublicKey: Ed25519PublicKeySchema,
  ed25519PrivateKey: Ed25519PrivateKeySchema,
  privateKeyWithType: PrivateKeyWithTypeSchema,

  // HBAR schemas
  hbarDecimal: HbarDecimalSchema,
  tinybar: TinybarSchema,

  // HTS schemas
  htsDecimals: HtsDecimalsSchema,
  htsBaseUnit: HtsBaseUnitSchema,
  htsDecimal: HtsDecimalSchema,

  // EVM schemas
  evmDecimals: EvmDecimalsSchema,
  evmBaseUnit: EvmBaseUnitSchema,
  evmDecimal: EvmDecimalSchema,

  // Legacy schemas
  entityId: EntityIdSchema,
  timestamp: TimestampSchema,
  transactionId: TransactionIdSchema,
  tokenAmount: TokenAmountSchema,
  tokenBalance: TokenBalanceSchema,
  tinybarBalance: TinybarBalanceSchema,
  evmAddress: EvmAddressSchema,
  accountIdKeyPair: AccountIdKeyPairSchema,
  publicKey: PublicKeySchema,
  network: NetworkSchema,
  keyType: KeyTypeSchema,
  supplyType: SupplyTypeSchema,
  isoTimestamp: IsoTimestampSchema,
  accountData: AccountDataSchema,
  tokenData: TokenDataSchema,
  topicData: TopicDataSchema,
  transactionResult: TransactionResultSchema,
} as const;

/**
 * Type exports for TypeScript inference
 */
export type EcdsaPublicKey = z.infer<typeof EcdsaPublicKeySchema>;
export type EcdsaPrivateKey = z.infer<typeof EcdsaPrivateKeySchema>;
export type Ed25519PublicKey = z.infer<typeof Ed25519PublicKeySchema>;
export type Ed25519PrivateKey = z.infer<typeof Ed25519PrivateKeySchema>;
export type HbarDecimal = z.infer<typeof HbarDecimalSchema>;
export type Tinybar = z.infer<typeof TinybarSchema>;
export type HtsDecimals = z.infer<typeof HtsDecimalsSchema>;
export type HtsBaseUnit = z.infer<typeof HtsBaseUnitSchema>;
export type HtsDecimal = z.infer<typeof HtsDecimalSchema>;
export type EvmDecimals = z.infer<typeof EvmDecimalsSchema>;
export type EvmBaseUnit = z.infer<typeof EvmBaseUnitSchema>;
export type EvmDecimal = z.infer<typeof EvmDecimalSchema>;

// Legacy types
export type EntityId = z.infer<typeof EntityIdSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type TransactionId = z.infer<typeof TransactionIdSchema>;
export type AccountIdKeyPair = z.infer<typeof AccountIdKeyPairSchema>;
export type TokenAmount = z.infer<typeof TokenAmountSchema>;
export type TokenBalance = z.infer<typeof TokenBalanceSchema>;
export type TinybarBalance = z.infer<typeof TinybarBalanceSchema>;
export type EvmAddress = z.infer<typeof EvmAddressSchema>;
export type PublicKey = z.infer<typeof PublicKeySchema>;
export type Network = z.infer<typeof NetworkSchema>;
export type KeyType = z.infer<typeof KeyTypeSchema>;
export type SupplyType = z.infer<typeof SupplyTypeSchema>;
export type IsoTimestamp = z.infer<typeof IsoTimestampSchema>;
export type AccountData = z.infer<typeof AccountDataSchema>;
export type TokenData = z.infer<typeof TokenDataSchema>;
export type TopicData = z.infer<typeof TopicDataSchema>;
export type TransactionResult = z.infer<typeof TransactionResultSchema>;
