/**
 * Common Zod Schema Definitions
 *
 * This file contains reusable Zod schemas for common Hedera data types
 * that are used across multiple plugin command outputs.
 *
 * Based on ADR-003: Result-Oriented Command Handler Contract
 */
import type { Credential } from '@/core/services/kms/kms-types.interface';

import { z } from 'zod';

import { CredentialType } from '@/core/services/kms/kms-types.interface';
import { HederaTokenType, KeyAlgorithm } from '@/core/shared/constants';
import {
  EntityReferenceType,
  SupplyType,
  SupportedNetwork,
} from '@/core/types/shared.types';

// Raw key patterns (without prefix) for validation
const PUBLIC_KEY_PATTERN =
  /^(?:0[2-3][0-9a-fA-F]{64}|[0-9a-fA-F]{64}|30[0-9a-fA-F]{60,150})$/;
const PRIVATE_KEY_PATTERN =
  /^(?:(?:0x)?[0-9a-fA-F]{64}|(?:0x)?[0-9a-fA-F]{128}|(?:0x)?30[0-9a-fA-F]{80,180})$/;

// ======================================================
// 1. ECDSA (secp256k1) Keys
// ======================================================

// Public key — ecdsa:<key> or raw 33 bytes (compressed) or DER (~70 bytes)
export const EcdsaPublicKeySchema = z
  .string()
  .trim()
  .transform((s) => (s.startsWith('ecdsa:') ? s.slice(6) : s))
  .refine(
    (s) => PUBLIC_KEY_PATTERN.test(s),
    'Invalid ECDSA public key: use ecdsa:<key> or 33-byte compressed hex / DER encoding',
  );

// Private key — ecdsa:<key> or raw 32 bytes (hex) or DER (~120 bytes)
export const EcdsaPrivateKeySchema = z
  .string()
  .trim()
  .transform((s) => (s.startsWith('ecdsa:') ? s.slice(6) : s))
  .refine(
    (s) => PRIVATE_KEY_PATTERN.test(s),
    'Invalid ECDSA private key: use ecdsa:<key> or 32-byte hex / DER encoding',
  );

// ======================================================
// 2. Ed25519 Keys
// ======================================================

// Public key — ed25519:<key> or raw 32 bytes (hex) or DER (~44 bytes)
export const Ed25519PublicKeySchema = z
  .string()
  .trim()
  .transform((s) => (s.startsWith('ed25519:') ? s.slice(8) : s))
  .refine(
    (s) => PUBLIC_KEY_PATTERN.test(s),
    'Invalid Ed25519 public key: use ed25519:<key> or 32-byte hex / DER encoding',
  );

// Private key — ed25519:<key> or raw 32/64 bytes (hex) or DER (~80 bytes)
export const Ed25519PrivateKeySchema = z
  .string()
  .trim()
  .transform((s) => (s.startsWith('ed25519:') ? s.slice(8) : s))
  .refine(
    (s) => PRIVATE_KEY_PATTERN.test(s),
    'Invalid Ed25519 private key: use ed25519:<key> or 32/64-byte hex / DER encoding',
  );

// ======================================================
// 3. HBAR balances (in HBARs, decimal format)
// ======================================================

// 1 HBAR = 100,000,000 tinybars (8 decimals)
// Safe 64-bit signed tinybar limit = 9,223,372,036,854,775,807 tinybars
const MAX_TINYBARS = 9_223_372_036_854_775_807n;
const MIN_TINYBARS = -9_223_372_036_854_775_808n;

// ======================================================
// 4. Tinybar balances (base unit integer)
// ======================================================
export const TinybarSchema = z
  .union([
    z.string().regex(/^-?\d+$/, 'Tinybars must be integer string'),
    z.int(),
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

// HTS decimals(immutable after token creation)
export const HtsDecimalsSchema = z.int().min(0);

// HTS base unit (integer form)
export const HtsBaseUnitSchema = z
  .union([
    z.string().regex(/^\d+$/, 'Base unit must be integer string'),
    z.int(),
    z.bigint(),
  ])
  .transform((val) => BigInt(val))
  .refine(
    (val) => val >= 0n && val <= MAX_TINYBARS,
    `HTS base unit out of int64 range`,
  );

// ======================================================
// 6. EVM Token Balances (ERC-20 style)
// ======================================================

export const EvmDecimalsSchema = z
  .union([z.int(), z.bigint()])
  .transform((val) => Number(val))
  .pipe(z.number().int());

// Base unit (wei-like integer)
export const EvmBaseUnitSchema = z
  .union([
    z.string().regex(/^\d+$/, 'Base unit must be integer string'),
    z.int(),
    z.bigint(),
  ])
  .transform((val) => BigInt(val))
  .refine((val) => val >= 0n, 'EVM base unit cannot be negative');

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
 * Account ID with Private Key (without keyType support)
 * Format: accountId:privateKey
 * Supports both ECDSA and ED25519 keys in HEX or DER format
 * Example: 0.0.123456:302e020100301006072a8648ce3d020106052b8104000a04220420...
 * Example: 0.0.123456:1234567890abcdef...
 */
export const AccountIdWithPrivateKeySchema = z
  .string()
  .regex(
    /^0\.0\.[1-9][0-9]*:(?:(?:0x)?[0-9a-fA-F]{64}|(?:0x)?[0-9a-fA-F]{128}|30[0-9a-fA-F]{80,})$/i,
    'Account ID with private key must be in format {accountId}:{private_key}',
  )
  .transform((val) => {
    const [accountId, ...keyParts] = val.split(':');
    return {
      accountId,
      privateKey: keyParts.join(':'),
    };
  })
  .describe('Account ID with private key in format {accountId}:{private_key}');

/**
 * Network name
 * Supported Hedera network names
 */
export const NetworkSchema = z
  .enum(SupportedNetwork)
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
  .enum(SupplyType)
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

// ======================================================
// 9. Input Schemas (Command Arguments - Reusable)
// ======================================================

/**
 * Positive Integer Filter Field
 * Used for numeric comparison operators (gt, gte, lt, lte, eq)
 * Accepts integers > 0 (Mirror Node API requirement)
 */
export const PositiveIntFilterFieldSchema = z
  .number()
  .int()
  .positive('Filter value must be greater than 0')
  .optional()
  .describe('Positive integer filter value');

/**
 * Alias Name Input (Base Schema)
 * Base schema for all entity aliases (alphanumeric, hyphens, underscores)
 * Used as foundation for AccountNameSchema, TopicNameSchema, TokenAliasNameSchema
 */
export const AliasNameSchema = z
  .string()
  .trim()
  .min(1, 'Alias name cannot be empty')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Alias name must contain only letters, numbers, hyphens, and underscores',
  )
  .describe('Entity alias name');

/**
 * Account Name Input
 * Account name/alias (alphanumeric, hyphens, underscores)
 */
export const AccountNameSchema = AliasNameSchema.describe(
  'Account name or alias',
);

/**
 * Entity Reference Input (ID or Name)
 * Universal schema for referencing any Hedera entity by ID or name
 * Used for tokens, topics, contracts, etc.
 * Accepts: Hedera entity ID (0.0.xxx) or alias name
 */
export const EntityReferenceSchema = z
  .union([EntityIdSchema, AliasNameSchema], {
    error: () => ({
      message:
        'Entity reference must be a valid Hedera ID (0.0.xxx) or alias name',
    }),
  })
  .describe('Entity reference (ID or name)');

/**
 * Entity or EVM Address Reference Input
 * Universal schema for referencing any Hedera entity by ID, EVM address, or alias name
 */
export const EntityOrEvmAddressReferenceSchema = z
  .union([EntityIdSchema, AliasNameSchema, EvmAddressSchema], {
    error: () => ({
      message:
        'Entity reference must be a valid Hedera ID (0.0.xxx), alias name, or EVM address (0x...)',
    }),
  })
  .describe('Entity reference (ID, EVM address, or name)');

/**
 * Parsed contract reference as a discriminated object by type (EVM address, entity ID, or alias).
 * Use this when the handler needs to branch on which kind of reference was provided.
 */
export const ContractReferenceObjectSchema = z
  .string()
  .trim()
  .min(1, 'Contract identifier cannot be empty')
  .transform((val): { type: EntityReferenceType; value: string } => {
    if (EvmAddressSchema.safeParse(val).success) {
      return { type: EntityReferenceType.EVM_ADDRESS, value: val };
    }
    if (EntityIdSchema.safeParse(val).success) {
      return { type: EntityReferenceType.ENTITY_ID, value: val };
    }
    if (AliasNameSchema.safeParse(val).success) {
      return { type: EntityReferenceType.ALIAS, value: val };
    }
    throw new Error(
      'Contract reference must be a valid Hedera ID (0.0.xxx), alias name, or EVM address (0x...)',
    );
  })
  .describe('Contract identifier (ID, EVM address, or alias)');

/**
 * Parsed account reference as a discriminated object by type (EVM address, entity ID, or alias).
 * Use this when the handler needs to branch on which kind of reference was provided.
 */
export const AccountReferenceObjectSchema = z
  .string()
  .trim()
  .min(1, 'Account identifier cannot be empty')
  .transform((val): { type: EntityReferenceType; value: string } => {
    if (EvmAddressSchema.safeParse(val).success) {
      return { type: EntityReferenceType.EVM_ADDRESS, value: val };
    }
    if (EntityIdSchema.safeParse(val).success) {
      return { type: EntityReferenceType.ENTITY_ID, value: val };
    }
    if (AliasNameSchema.safeParse(val).success) {
      return { type: EntityReferenceType.ALIAS, value: val };
    }
    throw new Error(
      'Account reference must be a valid Hedera ID (0.0.xxx), alias name, or EVM address (0x...)',
    );
  })
  .describe('Account identifier (ID, EVM address, or alias)');

/**
 * Parsed token reference as a discriminated object by type (entity ID or alias).
 */
export const TokenReferenceObjectSchema = z
  .string()
  .trim()
  .min(1, 'Token identifier cannot be empty')
  .transform((val): { type: EntityReferenceType; value: string } => {
    if (EntityIdSchema.safeParse(val).success) {
      return { type: EntityReferenceType.ENTITY_ID, value: val };
    }
    if (AliasNameSchema.safeParse(val).success) {
      return { type: EntityReferenceType.ALIAS, value: val };
    }
    throw new Error(
      'Token reference must be a valid Hedera ID (0.0.xxx) or alias name',
    );
  })
  .describe('Token identifier (ID or alias)');

/**
 * Account Reference Input (ID or Name)
 * Extended schema for referencing accounts specifically
 * Supports: Hedera account ID (0.0.xxx), EVM address (0x...), or account name/alias
 */
export const AccountReferenceSchema = z
  .union([EntityIdSchema, AccountNameSchema], {
    error: () => ({
      message:
        'Account reference must be a valid Hedera ID (0.0.xxx) or alias name',
    }),
  })
  .describe('Account reference (ID, EVM address, or name)');

/**
 * Amount Input
 * Accepts amount as string in format:
 * - "100" (integer amount)
 * - "100.5" (float amount)
 * - "100t" (integer in base units / tinybars)
 * NOTE: Float with "t" suffix (e.g., "100.5t") is NOT allowed
 * Handler is responsible for parsing and converting to appropriate unit
 * Used for HBAR, tokens, and other balance inputs
 */
export const AmountInputSchema = z.coerce
  .string()
  .trim()
  .regex(
    /^(?:\d+\.\d+|\d+t|\d+)$/,
    'Amount must be: integer, float, or integer with "t" for base units (float with "t" is not allowed)',
  )
  .describe('Amount input (integer, float, or integer with "t" suffix)');

/**
 * Key Manager Type
 * Supported key manager implementations for private key storage
 */
export const KeyManagerTypeSchema = z
  .enum(['local', 'local_encrypted'])
  .describe('Key manager type for storing private keys');

/**
 * Topic Name Input
 * Topic name/alias (alphanumeric, hyphens, underscores)
 */
export const TopicNameSchema = AliasNameSchema.describe('Topic name or alias');

/**
 * Token Alias Name Input
 * Local alias for a token (alphanumeric, hyphens, underscores)
 * NOTE: This is different from TokenNameSchema which is the on-chain token name
 */
export const TokenAliasNameSchema = AliasNameSchema.describe(
  'Token alias name (local identifier, not on-chain name)',
);

/**
 * Memo Input
 * Optional memo field for transactions
 * Max 100 characters as per Hedera specifications
 */
export const MemoSchema = z
  .string()
  .trim()
  .max(100, 'Memo must be 100 characters or less')
  .optional()
  .describe('Optional memo for the transaction');

/**
 * Token Type schema
 * Optional Token Type field for transactions
 * Enum of HederaTokenType
 */
export const TokenTypeSchema = z
  .enum(HederaTokenType)
  .optional()
  .default(HederaTokenType.FUNGIBLE_COMMON);

/**
 * Key or Account Alias Input (Normalized)
 * Accepts AccountID:privateKey pair format or account name/alias
 * Transforms input into normalized discriminated union for easier handler processing:
 * - alias input → { type: 'alias', alias: string }
 * - keypair input → { type: 'keypair', accountId: string, privateKey: string }
 * The keyType must be fetched from mirror node when keypair is provided
 */
export const KeyOrAccountAliasSchema = z
  .union([AccountIdWithPrivateKeySchema, AccountNameSchema])
  .transform((val) =>
    typeof val === 'string'
      ? { type: 'alias' as const, alias: val }
      : { type: 'keypair' as const, ...val },
  )
  .describe(
    'Account ID with private key in format {accountId}:{private_key} or account name/alias',
  );

export const KeyReferenceSchema = z
  .string()
  .trim()
  .regex(
    /^kr_[A-Za-z0-9]+$/,
    'Key reference must start with "kr_" and contain only alphanumeric characters after the prefix',
  )
  .describe(
    'Key reference identifier (kr_ prefix + alphanumeric) managed by the key manager',
  );

export const KeySchema = z
  .string()
  .transform((val): Credential => {
    const accountKeypair = AccountIdWithPrivateKeySchema.safeParse(val);
    if (accountKeypair.success) {
      return {
        type: CredentialType.ACCOUNT_KEY_PAIR,
        accountId: accountKeypair.data.accountId,
        privateKey: accountKeypair.data.privateKey,
        rawValue: val,
      };
    }

    const privateKey = PrivateKeyDefinitionWithTypeSchema.safeParse(val);
    if (privateKey.success) {
      return {
        type: CredentialType.PRIVATE_KEY,
        privateKey: privateKey.data.privateKey,
        keyType: privateKey.data.keyType,
        rawValue: val,
      };
    }

    const publicKey = PublicKeyDefintionWithTypeSchema.safeParse(val);
    if (publicKey.success) {
      return {
        type: CredentialType.PUBLIC_KEY,
        publicKey: publicKey.data.publicKey,
        keyType: publicKey.data.keyType,
        rawValue: val,
      };
    }

    const accountId = EntityIdSchema.safeParse(val);
    if (accountId.success) {
      return {
        type: CredentialType.ACCOUNT_ID,
        accountId: accountId.data,
        rawValue: val,
      };
    }

    const keyRef = KeyReferenceSchema.safeParse(val);
    if (keyRef.success) {
      return {
        type: CredentialType.KEY_REFERENCE,
        keyReference: keyRef.data,
        rawValue: val,
      };
    }

    const alias = AliasNameSchema.safeParse(val);
    if (alias.success) {
      return {
        type: CredentialType.ALIAS,
        alias: alias.data,
        rawValue: val,
      };
    }

    throw new Error(
      'Key must be a valid account ID and private key pair in format {account-id:private-key}, account ID, private key in format {ed25519|ecdsa}:{private-key}, public key in format {ed25519|ecdsa}:{public-key}, key reference or alias name',
    );
  })
  .describe(
    'Account ID with private key in {accountId}:{private_key} format, account public key in {ed25519|ecdsa}:{public-key} format, account private key in {ed25519|ecdsa}:{private-key} format, account ID, account name/alias or account key reference',
  );

export const PrivateKeySchema = z
  .string()
  .transform((val): Credential => {
    const accountKeypair = AccountIdWithPrivateKeySchema.safeParse(val);
    if (accountKeypair.success) {
      return {
        type: CredentialType.ACCOUNT_KEY_PAIR,
        accountId: accountKeypair.data.accountId,
        privateKey: accountKeypair.data.privateKey,
        rawValue: val,
      };
    }

    const privateKey = PrivateKeyDefinitionWithTypeSchema.safeParse(val);
    if (privateKey.success) {
      return {
        type: CredentialType.PRIVATE_KEY,
        privateKey: privateKey.data.privateKey,
        keyType: privateKey.data.keyType,
        rawValue: val,
      };
    }

    const keyRef = KeyReferenceSchema.safeParse(val);
    if (keyRef.success) {
      return {
        type: CredentialType.KEY_REFERENCE,
        keyReference: keyRef.data,
        rawValue: val,
      };
    }

    const alias = AliasNameSchema.safeParse(val);
    if (alias.success) {
      return {
        type: CredentialType.ALIAS,
        alias: alias.data,
        rawValue: val,
      };
    }

    throw new Error(
      'Private key must be a valid account ID and private key pair in {account-id:private-key} format, private key in format {ed25519|ecdsa}:{private-key}, key reference or alias name',
    );
  })
  .describe(
    'Account ID and private key pair in {account-id:private-key} format, account private key in format {ed25519|ecdsa}:{private-key}, account key reference or alias name',
  );

export const PrivateKeyWithAccountIdSchema = z
  .string()
  .transform((val): Credential => {
    const accountKeypair = AccountIdWithPrivateKeySchema.safeParse(val);
    if (accountKeypair.success) {
      return {
        type: CredentialType.ACCOUNT_KEY_PAIR,
        accountId: accountKeypair.data.accountId,
        privateKey: accountKeypair.data.privateKey,
        rawValue: val,
      };
    }

    const keyRef = KeyReferenceSchema.safeParse(val);
    if (keyRef.success) {
      return {
        type: CredentialType.KEY_REFERENCE,
        keyReference: keyRef.data,
        rawValue: val,
      };
    }

    const alias = AliasNameSchema.safeParse(val);
    if (alias.success) {
      return {
        type: CredentialType.ALIAS,
        alias: alias.data,
        rawValue: val,
      };
    }

    throw new Error(
      'Private key with account ID must be a valid account ID and private key pair in {account-id:private-key} format, key reference or alias name',
    );
  })
  .describe(
    'Account ID and private key pair in {account-id:private-key} format, account key reference or alias name',
  );

/**
 * Configuration Option Name
 * Name of a configuration option (alphanumeric, hyphens, underscores)
 */
export const ConfigOptionNameSchema = z
  .string()
  .trim()
  .min(1, 'Configuration option name cannot be empty')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Configuration option name must contain only letters, numbers, hyphens, and underscores',
  )
  .describe('Configuration option name');

/**
 * Configuration Option Value
 * Value for configuration option (can be string, number, or boolean as string)
 * Handler will parse it to appropriate type
 */
export const ConfigOptionValueSchema = z
  .preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const s = value.trim().toLowerCase();

      if (s === 'true') return true;
      if (s === 'false') return false;

      const n = Number(value);
      if (!Number.isNaN(n) && Number.isFinite(n)) return n;

      return value;
    },
    z.union([z.boolean(), z.number(), z.string()]),
  )
  .describe('Configuration option value (boolean, number, or string)');

/**
 * Key Reference ID
 * Identifier for a key stored in KMS (Key Management System)
 */
export const KeyRefIdSchema = z
  .string()
  .trim()
  .min(1, 'Key reference ID cannot be empty')
  .describe('Key reference ID from KMS storage');

/**
 * Plugin Name
 * Name of a plugin (alphanumeric, hyphens, underscores)
 */
export const PluginNameSchema = z
  .string()
  .trim()
  .min(1, 'Plugin name cannot be empty')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Plugin name must contain only letters, numbers, hyphens, and underscores',
  )
  .describe('Plugin name');

/**
 * File Path
 * Filesystem path (absolute or relative)
 */
export const FilePathSchema = z
  .string()
  .trim()
  .min(1, 'File path cannot be empty')
  .describe('Filesystem path (absolute or relative)');

/**
 * State Namespace Name
 * Name of a state namespace (alphanumeric, hyphens, underscores)
 */
export const StateNamespaceSchema = z
  .string()
  .trim()
  .min(1, 'Namespace name cannot be empty')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Namespace name must contain only letters, numbers, hyphens, and underscores',
  )
  .describe('State namespace name');

/**
 * Token Name
 * Name of a token (alphanumeric, spaces, hyphens)
 */
export const TokenNameSchema = z
  .string()
  .trim()
  .min(1, 'Token name cannot be empty')
  .max(100, 'Token name must be 100 characters or less')
  .describe('Token name');

/**
 * Token Symbol
 * Symbol/ticker for a token (alphanumeric, uppercase)
 */
export const TokenSymbolSchema = z
  .string()
  .trim()
  .min(1, 'Token symbol cannot be empty')
  .max(20, 'Token symbol must be 20 characters or less')
  .describe('Token symbol');

/**
 * NFT Serial Numbers Input
 * Comma-separated list of NFT serial numbers
 * Transformed to array of positive integers
 */
export const NftSerialNumbersSchema = z
  .string()
  .trim()
  .transform((val) => val.split(',').map((s) => parseInt(s.trim(), 10)))
  .pipe(
    z
      .array(z.int().positive('Serial numbers must be positive integers'))
      .min(1, 'At least one serial number is required')
      .max(10, 'Maximum 10 serial numbers allowed'),
  )
  .describe('NFT serial numbers (comma-separated list)');

// ======================================================
// 10. Legacy Compatibility Exports
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
export const PublicKeyDefinitionSchema = z.union([
  EcdsaPublicKeySchema,
  Ed25519PublicKeySchema,
]);

export const PublicKeyDefintionWithTypeSchema = z.union([
  EcdsaPublicKeySchema.transform((key) => ({
    keyType: KeyAlgorithm.ECDSA,
    publicKey: key,
  })),
  Ed25519PublicKeySchema.transform((key) => ({
    keyType: KeyAlgorithm.ED25519,
    publicKey: key,
  })),
]);

// Generic private key schema (ECDSA or ED25519)
export const PrivateKeyDefinitionSchema = z.union([
  EcdsaPrivateKeySchema,
  Ed25519PrivateKeySchema,
]);

export const PrivateKeyDefinitionWithTypeSchema = z.union([
  EcdsaPrivateKeySchema.transform((key) => ({
    keyType: KeyAlgorithm.ECDSA,
    privateKey: key,
  })),
  Ed25519PrivateKeySchema.transform((key) => ({
    keyType: KeyAlgorithm.ED25519,
    privateKey: key,
  })),
]);

export const NonNegativeNumberOrBigintSchema = z
  .union([z.number(), z.bigint()])
  .transform((val) => BigInt(val))
  .pipe(z.bigint().nonnegative());

/**
 * Contract Name Input (Base Schema)
 * Base schema for all contract names (alphanumeric, hyphens, underscores)
 * Used as foundation for ContractNameSchema
 */
export const ContractNameSchema = z
  .string()
  .trim()
  .min(1, 'Contract name cannot be empty')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Contract name must contain only letters, numbers, hyphens, and underscores',
  )
  .describe('Contract name');

export const ContractVerifiedSchema = z
  .boolean()
  .optional()
  .describe('Contract verification status');

/**
 * Contract Symbol Input (Base Schema)
 * Base schema for all contract symbols (alphanumeric, hyphens, underscores)
 * Used as foundation for ContractSymbolSchema
 */
export const ContractSymbolSchema = z
  .string()
  .trim()
  .min(1, 'Contract symbol cannot be empty')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Contract symbol must contain only letters, numbers, hyphens, and underscores',
  )
  .describe('Contract symbol');

/**
 * Solidity Compiler Version Input
 * Optional solidity compiler version field for transactions
 * Max 100 characters
 */
export const SolidityCompilerVersion = z
  .string()
  .trim()
  .optional()
  .describe('Optional Solidity compiler version');

export const GasInputSchema = z.number().min(0).default(100000);

/**
 * Approved Flag Input Schema
 * Accepts string ("true"/"false") and transforms to boolean
 */
export const ApprovedFlagSchema = z
  .stringbool({
    truthy: ['true'],
    falsy: ['false'],
  })
  .describe(
    'Whether to approve or revoke the operator. Value must be "true" or "false"',
  );

export const ContractErc721TokenIdSchema = z
  .int()
  .nonnegative('Token ID must be greater than or equal to 0')
  .describe('Token ID (uint256) for tokenURI query');

/**
 * Hex encoded data validation
 * Format: 0x followed by 40 hexadecimal characters
 */
export const HexEncodedDataSchema = z
  .string()
  .regex(
    /^0x[0-9a-fA-F]+$/,
    'Data must be a hex encoded string starting in format "0x12abfe456123"',
  )
  .describe('HEX encoded data format');
